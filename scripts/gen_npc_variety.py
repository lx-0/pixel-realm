#!/usr/bin/env python3
"""
Generate NPC variety art assets for PixelRealm (PIX-130).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette, SNES-era RPG style
  - 16×24 character sprites, max 8 colors each
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming: char_npc_{role}_{variant}.png

Zone Quest Givers (4-frame idle + interaction highlight):
  char_npc_quest_forest.png   — Forest Elder: green robes, white beard, staff
  char_npc_quest_desert.png   — Desert Nomad: sand cloak, hood, scroll
  char_npc_quest_dungeon.png  — Dungeon Keeper: dark armor, purple accents, lantern
  char_npc_quest_coastal.png  — Coastal Captain: blue coat, bicorn hat

Merchant NPCs (2-frame idle):
  char_npc_merchant_blacksmith.png — Heavy apron, hammer
  char_npc_merchant_alchemist.png  — Green hood, flask
  char_npc_merchant_trader.png     — Friendly hat, satchel

Faction Representatives (2-frame idle):
  char_npc_faction_merchants.png   — Gold-trimmed, medallion
  char_npc_faction_mages.png       — Purple robes, orb staff
  char_npc_faction_shadow.png      — Dark hood, red accents
  char_npc_faction_rangers.png     — Green ranger outfit, bow

Transport NPC (2-frame idle):
  char_npc_transport.png           — Portal keeper, crystal staff

NPC Interaction Indicators (16×16 each):
  icon_npc_quest_available.png     — Yellow exclamation mark (!)
  icon_npc_quest_progress.png      — Yellow question mark (?)
  icon_npc_merchant_indicator.png  — Gold coin ($)
  icon_npc_faction_indicator.png   — Star emblem
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
CHAR_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'characters')
ICON_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'icons')
os.makedirs(CHAR_DIR, exist_ok=True)
os.makedirs(ICON_DIR, exist_ok=True)

# ─── Palette (RGBA tuples) — from ART-STYLE-GUIDE.md ────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)  # shadow black / outline
DK  = (43,  43,  43,  255)  # dark rock
ST  = (74,  74,  74,  255)  # stone gray
MG  = (110, 110, 110, 255)  # mid gray
LS  = (150, 150, 150, 255)  # light stone
PG  = (200, 200, 200, 255)  # pale gray (skin)
NW  = (240, 240, 240, 255)  # near white

# Warm earth
BD  = (59,  32,  16,  255)  # deep soil
BN  = (107, 58,  31,  255)  # rich earth
DT  = (139, 92,  42,  255)  # dirt
SN  = (184, 132, 63,  255)  # sand / sandstone
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
IW  = (200, 240, 255, 255)  # ice white

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

# ─── Sprite helpers ──────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for __ in range(h)]

def copy_sprite(src):
    return [row[:] for row in src]

def hstack(frames):
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def set_px(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color

def swap_color(grid, old, new):
    """Return new grid with one color swapped."""
    out = copy_sprite(grid)
    for r in range(len(out)):
        for c in range(len(out[r])):
            if out[r][c] == old:
                out[r][c] = new
    return out

def shift_right(grid, px=1):
    """Shift all non-transparent pixels right by px."""
    out = copy_sprite(grid)
    h = len(out)
    w = len(out[0])
    for r in range(h):
        new_row = [_] * w
        for c in range(w):
            nc = c + px
            if 0 <= nc < w and out[r][c][3] > 0:
                new_row[nc] = out[r][c]
        out[r] = new_row
    return out

def add_highlight_glow(grid, glow_color):
    """Create a highlighted version with 1px glow outline around non-transparent pixels."""
    out = copy_sprite(grid)
    h = len(out)
    w = len(out[0])
    for r in range(h):
        for c in range(w):
            if out[r][c][3] == 0:
                # Check if adjacent to non-transparent pixel
                for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
                    nr, nc = r+dr, c+dc
                    if 0 <= nr < h and 0 <= nc < w and grid[nr][nc][3] > 0:
                        out[r][c] = glow_color
                        break
    return out


# ═══════════════════════════════════════════════════════════════════════════════
# ZONE-SPECIFIC QUEST GIVERS (16×24, 4 idle frames + highlight)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Zone Quest Givers ===')

# ─── 1. FOREST ELDER ─────────────────────────────────────────────────────────
# Green robes, white beard, wooden staff, druid hat
# Colors: K, DF, FG, LG, NW, PG, BN, DT (8)

FOREST_ELDER = [
    #0  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  BN, _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 1  staff top + hat tip
    [_, _,  _,  BN, _,  _,  K,  FG, FG, FG, K,  _,  _,  _,  _,  _],  # 2  staff + hat
    [_, _,  _,  BN, _,  K,  FG, LG, LG, LG, FG, K,  _,  _,  _,  _],  # 3  hat body
    [_, _,  _,  BN, K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _],  # 4  hat brim
    [_, _,  _,  BN, _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _],  # 5  forehead
    [_, _,  _,  BN, _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _],  # 6  eyes (2 dots)
    [_, _,  _,  BN, _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _],  # 7  nose
    [_, _,  _,  BN, _,  _,  _,  K,  NW, K,  _,  _,  _,  _,  _,  _],  # 8  beard top
    [_, _,  _,  BN, _,  _,  _,  K,  NW, K,  _,  _,  _,  _,  _,  _],  # 9  beard
    [_, _,  _,  BN, _,  _,  K,  FG, FG, FG, K,  _,  _,  _,  _,  _],  # 10 collar
    [_, _,  _,  BN, _,  K,  FG, LG, FG, LG, FG, K,  _,  _,  _,  _],  # 11 shoulders
    [_, _,  _,  K,  BN, K,  FG, LG, FG, LG, FG, K,  _,  _,  _,  _],  # 12 torso (hand on staff)
    [_, _,  _,  K,  BN, K,  DF, FG, LG, FG, DF, K,  _,  _,  _,  _],  # 13 torso
    [_, _,  _,  K,  BN, _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _],  # 14 waist
    [_, _,  _,  K,  BN, _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _],  # 15 lower robe
    [_, _,  _,  _,  K,  _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _],  # 16 robe
    [_, _,  _,  _,  K,  _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _],  # 17 robe
    [_, _,  _,  _,  _,  _,  K,  DF, DF, DF, K,  _,  _,  _,  _,  _],  # 18 robe bottom
    [_, _,  _,  _,  _,  _,  _,  K,  DF, K,  _,  _,  _,  _,  _,  _],  # 19 robe hem
    [_, _,  _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 20 robe edge
    [_, _,  _,  _,  _,  _,  K,  DT, K,  DT, K,  _,  _,  _,  _,  _],  # 21 feet
    [_, _,  _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

# 4-frame idle: base, sway-right + leaf glow, base-blink, sway-left
fe_f0 = copy_sprite(FOREST_ELDER)
fe_f1 = copy_sprite(FOREST_ELDER)
set_px(fe_f1, 7, 3, BG)   # leaf glow on hat
set_px(fe_f1, 8, 6, PG)   # blink (close left eye)
fe_f2 = copy_sprite(FOREST_ELDER)
set_px(fe_f2, 8, 3, BG)   # different leaf glow
fe_f3 = copy_sprite(FOREST_ELDER)
set_px(fe_f3, 8, 6, PG)   # blink
set_px(fe_f3, 9, 3, BG)   # leaf shimmer

# Highlight: golden glow
fe_hl = add_highlight_glow(FOREST_ELDER, (255, 224, 64, 120))

sheet = hstack([fe_f0, fe_f1, fe_f2, fe_f3, fe_hl])
write_png(os.path.join(CHAR_DIR, 'char_npc_quest_forest.png'), sheet)


# ─── 2. DESERT NOMAD ────────────────────────────────────────────────────────
# Sand-colored hooded cloak, dark skin (DT), holds scroll (PS)
# Colors: K, SN, DS, PS, BD, BN, DT, NW (8)

DESERT_NOMAD = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1  hood tip
    [_, _,  _,  _,  _,  K,  SN, DS, SN, K,  _,  _,  _,  _,  _,  _],  # 2  hood
    [_, _,  _,  _,  K,  SN, DS, DS, DS, SN, K,  _,  _,  _,  _,  _],  # 3  hood body
    [_, _,  _,  _,  K,  SN, SN, SN, SN, SN, K,  _,  _,  _,  _,  _],  # 4  hood brim
    [_, _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _],  # 5  face (dark skin)
    [_, _,  _,  _,  _,  K,  DT, K,  DT, K,  _,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _],  # 7  lower face
    [_, _,  _,  _,  _,  _,  K,  BD, K,  _,  _,  _,  _,  _,  _,  _],  # 8  beard
    [_, _,  _,  _,  _,  K,  SN, SN, SN, K,  _,  _,  _,  _,  _,  _],  # 9  collar
    [_, _,  _,  _,  K,  SN, DS, SN, DS, SN, K,  _,  _,  _,  _,  _],  # 10 shoulders
    [_, _,  _,  _,  K,  BN, SN, DS, SN, BN, K,  _,  _,  _,  _,  _],  # 11 upper body
    [_, _,  _,  _,  K,  BN, SN, DS, SN, BN, K,  PS, _,  _,  _,  _],  # 12 torso + scroll
    [_, _,  _,  _,  K,  BD, BN, SN, BN, BD, K,  PS, _,  _,  _,  _],  # 13 torso
    [_, _,  _,  _,  _,  K,  BD, BN, BD, K,  K,  _,  _,  _,  _,  _],  # 14 waist + belt
    [_, _,  _,  _,  _,  K,  BD, BN, BD, K,  _,  _,  _,  _,  _,  _],  # 15 lower robe
    [_, _,  _,  _,  _,  K,  BD, BN, BD, K,  _,  _,  _,  _,  _,  _],  # 16 robe
    [_, _,  _,  _,  _,  K,  BD, BN, BD, K,  _,  _,  _,  _,  _,  _],  # 17 robe
    [_, _,  _,  _,  _,  K,  BD, BD, BD, K,  _,  _,  _,  _,  _,  _],  # 18 robe bottom
    [_, _,  _,  _,  _,  _,  K,  BD, K,  _,  _,  _,  _,  _,  _,  _],  # 19 robe hem
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 20 robe edge
    [_, _,  _,  _,  _,  K,  SN, K,  SN, K,  _,  _,  _,  _,  _,  _],  # 21 sandals
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

dn_f0 = copy_sprite(DESERT_NOMAD)
dn_f1 = copy_sprite(DESERT_NOMAD)
set_px(dn_f1, 7, 6, DT)   # blink
set_px(dn_f1, 11, 12, NW)  # scroll shimmer
dn_f2 = copy_sprite(DESERT_NOMAD)
set_px(dn_f2, 8, 3, PS)   # hood highlight shift
dn_f3 = copy_sprite(DESERT_NOMAD)
set_px(dn_f3, 7, 6, DT)   # blink
set_px(dn_f3, 7, 3, PS)   # hood shimmer

dn_hl = add_highlight_glow(DESERT_NOMAD, (255, 224, 64, 120))
sheet = hstack([dn_f0, dn_f1, dn_f2, dn_f3, dn_hl])
write_png(os.path.join(CHAR_DIR, 'char_npc_quest_desert.png'), sheet)


# ─── 3. DUNGEON KEEPER ──────────────────────────────────────────────────────
# Dark armor, horned helmet, purple accents, holds lantern (FR glow)
# Colors: K, DK, ST, MG, MP, FR, PG, EM (8)

DUNGEON_KEEPER = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  K,  _,  _,  K,  K,  _,  _,  K,  _,  _,  _,  _],  # 1  helmet horns
    [_, _,  _,  _,  K,  K,  K,  ST, ST, K,  K,  K,  _,  _,  _,  _],  # 2  helmet
    [_, _,  _,  _,  _,  K,  DK, ST, ST, DK, K,  _,  _,  _,  _,  _],  # 3  helmet body
    [_, _,  _,  _,  _,  K,  MP, MP, MP, MP, K,  _,  _,  _,  _,  _],  # 4  visor (purple)
    [_, _,  _,  _,  _,  K,  PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 5  face
    [_, _,  _,  _,  _,  K,  PG, K,  K,  PG, K,  _,  _,  _,  _,  _],  # 6  eyes (stern)
    [_, _,  _,  _,  _,  K,  PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 7  jaw
    [_, _,  _,  _,  _,  _,  K,  MG, MG, K,  _,  _,  _,  _,  _,  _],  # 8  chin guard
    [_, _,  _,  _,  _,  K,  DK, ST, ST, DK, K,  _,  _,  _,  _,  _],  # 9  gorget
    [_, _,  _,  _,  K,  DK, ST, DK, DK, ST, DK, K,  _,  _,  _,  _],  # 10 shoulders
    [_, _,  _,  _,  K,  DK, ST, MP, MP, ST, DK, K,  FR, _,  _,  _],  # 11 armor + lantern
    [_, _,  _,  _,  K,  DK, DK, ST, ST, DK, DK, K,  EM, _,  _,  _],  # 12 torso + lantern glow
    [_, _,  _,  _,  K,  DK, DK, MP, MP, DK, DK, K,  _,  _,  _,  _],  # 13 torso
    [_, _,  _,  _,  _,  K,  DK, ST, ST, DK, K,  _,  _,  _,  _,  _],  # 14 belt
    [_, _,  _,  _,  _,  K,  DK, DK, DK, DK, K,  _,  _,  _,  _,  _],  # 15 lower armor
    [_, _,  _,  _,  _,  K,  DK, ST, ST, DK, K,  _,  _,  _,  _,  _],  # 16 leg armor
    [_, _,  _,  _,  _,  K,  DK, DK, DK, DK, K,  _,  _,  _,  _,  _],  # 17 leg armor
    [_, _,  _,  _,  _,  K,  DK, DK, DK, DK, K,  _,  _,  _,  _,  _],  # 18 greaves
    [_, _,  _,  _,  _,  _,  K,  DK, DK, K,  _,  _,  _,  _,  _,  _],  # 19 boots top
    [_, _,  _,  _,  _,  _,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 20 boots
    [_, _,  _,  _,  _,  K,  DK, K,  DK, K,  _,  _,  _,  _,  _,  _],  # 21 boot soles
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

dk_f0 = copy_sprite(DUNGEON_KEEPER)
dk_f1 = copy_sprite(DUNGEON_KEEPER)
set_px(dk_f1, 12, 11, FR)  # lantern flicker
set_px(dk_f1, 12, 12, FR)  # brighter glow
dk_f2 = copy_sprite(DUNGEON_KEEPER)
set_px(dk_f2, 12, 11, EM)  # lantern dim
set_px(dk_f2, 7, 6, PG)    # blink (close eye)
dk_f3 = copy_sprite(DUNGEON_KEEPER)
set_px(dk_f3, 12, 11, FR)  # lantern bright
set_px(dk_f3, 12, 12, FR)

dk_hl = add_highlight_glow(DUNGEON_KEEPER, (255, 224, 64, 120))
sheet = hstack([dk_f0, dk_f1, dk_f2, dk_f3, dk_hl])
write_png(os.path.join(CHAR_DIR, 'char_npc_quest_dungeon.png'), sheet)


# ─── 4. COASTAL CAPTAIN ─────────────────────────────────────────────────────
# Blue captain's coat, bicorn hat, beard, nautical theme
# Colors: K, DP, SB, PB, NW, PG, BN, DT (8)

COASTAL_CAPTAIN = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 1  hat brim
    [_, _,  _,  _,  _,  K,  DP, SB, SB, DP, K,  _,  _,  _,  _,  _],  # 2  hat body
    [_, _,  _,  _,  _,  K,  DP, SB, SB, DP, K,  _,  _,  _,  _,  _],  # 3  hat body
    [_, _,  _,  _,  _,  K,  K,  PB, K,  K,  K,  _,  _,  _,  _,  _],  # 4  hat band + emblem
    [_, _,  _,  _,  _,  K,  PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 5  forehead
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  K,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, PG, K,  _,  _,  _,  _,  _],  # 7  nose
    [_, _,  _,  _,  _,  _,  K,  BN, BN, K,  _,  _,  _,  _,  _,  _],  # 8  beard
    [_, _,  _,  _,  _,  _,  _,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 9  chin
    [_, _,  _,  _,  _,  K,  DP, SB, SB, DP, K,  _,  _,  _,  _,  _],  # 10 collar
    [_, _,  _,  _,  K,  DP, SB, NW, NW, SB, DP, K,  _,  _,  _,  _],  # 11 shoulders + shirt
    [_, _,  _,  _,  K,  DP, SB, NW, NW, SB, DP, K,  _,  _,  _,  _],  # 12 coat
    [_, _,  _,  _,  K,  DP, DP, SB, SB, DP, DP, K,  _,  _,  _,  _],  # 13 coat body
    [_, _,  _,  _,  _,  K,  DP, PB, PB, DP, K,  _,  _,  _,  _,  _],  # 14 belt
    [_, _,  _,  _,  _,  K,  DP, SB, SB, DP, K,  _,  _,  _,  _,  _],  # 15 lower coat
    [_, _,  _,  _,  _,  K,  DP, SB, SB, DP, K,  _,  _,  _,  _,  _],  # 16 coat
    [_, _,  _,  _,  _,  K,  DP, DP, DP, DP, K,  _,  _,  _,  _,  _],  # 17 coat bottom
    [_, _,  _,  _,  _,  K,  DP, DP, DP, DP, K,  _,  _,  _,  _,  _],  # 18 coat edge
    [_, _,  _,  _,  _,  _,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 19 coat hem
    [_, _,  _,  _,  _,  K,  DT, K,  DT, DT, K,  _,  _,  _,  _,  _],  # 20 boots
    [_, _,  _,  _,  _,  K,  DT, K,  DT, DT, K,  _,  _,  _,  _,  _],  # 21 boots
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  K,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

cc_f0 = copy_sprite(COASTAL_CAPTAIN)
cc_f1 = copy_sprite(COASTAL_CAPTAIN)
set_px(cc_f1, 8, 6, PG)    # blink right eye
set_px(cc_f1, 8, 4, SB)    # hat emblem shimmer
cc_f2 = copy_sprite(COASTAL_CAPTAIN)
set_px(cc_f2, 7, 4, SB)    # emblem alt
cc_f3 = copy_sprite(COASTAL_CAPTAIN)
set_px(cc_f3, 8, 6, PG)    # blink
set_px(cc_f3, 8, 8, K)     # beard sway

cc_hl = add_highlight_glow(COASTAL_CAPTAIN, (255, 224, 64, 120))
sheet = hstack([cc_f0, cc_f1, cc_f2, cc_f3, cc_hl])
write_png(os.path.join(CHAR_DIR, 'char_npc_quest_coastal.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# MERCHANT NPCs (16×24, 2 idle frames)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Merchant NPCs ===')

# ─── 5. BLACKSMITH ───────────────────────────────────────────────────────────
# Bald/bandana, heavy build, leather apron, hammer
# Colors: K, BD, BN, DT, FR, PG, ST, DK (8)

BLACKSMITH = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 2  bald head top
    [_, _,  _,  _,  K,  DT, DT, DT, DT, DT, K,  _,  _,  _,  _,  _],  # 3  head (tanned skin)
    [_, _,  _,  _,  K,  FR, K,  K,  K,  FR, K,  _,  _,  _,  _,  _],  # 4  bandana (orange)
    [_, _,  _,  _,  K,  DT, DT, DT, DT, DT, K,  _,  _,  _,  _,  _],  # 5  face
    [_, _,  _,  _,  K,  DT, K,  DT, K,  DT, K,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  K,  DT, DT, DT, DT, DT, K,  _,  _,  _,  _,  _],  # 7  jaw
    [_, _,  _,  _,  _,  K,  DT, BD, DT, K,  _,  _,  _,  _,  _,  _],  # 8  chin + stubble
    [_, _,  _,  _,  K,  BN, BN, BN, BN, BN, K,  _,  _,  _,  _,  _],  # 9  apron top
    [_, _,  _,  K,  ST, BN, DT, BN, DT, BN, ST, K,  _,  _,  _,  _],  # 10 broad shoulders
    [_, _,  _,  K,  ST, BN, DT, BN, DT, BN, K,  K,  ST, _,  _,  _],  # 11 torso + hammer head
    [_, _,  _,  K,  K,  BD, BN, DT, BN, BD, K,  BN, K,  _,  _,  _],  # 12 torso + hammer handle
    [_, _,  _,  _,  K,  BD, BN, DT, BN, BD, K,  _,  _,  _,  _,  _],  # 13 torso
    [_, _,  _,  _,  _,  K,  BD, BN, BD, K,  _,  _,  _,  _,  _,  _],  # 14 belt
    [_, _,  _,  _,  _,  K,  DK, BD, DK, K,  _,  _,  _,  _,  _,  _],  # 15 pants
    [_, _,  _,  _,  _,  K,  DK, BD, DK, K,  _,  _,  _,  _,  _,  _],  # 16 pants
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 17 pants
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 18 pants bottom
    [_, _,  _,  _,  _,  _,  K,  DK, K,  _,  _,  _,  _,  _,  _,  _],  # 19 ankle
    [_, _,  _,  _,  _,  K,  BD, K,  BD, K,  _,  _,  _,  _,  _,  _],  # 20 boots
    [_, _,  _,  _,  _,  K,  BD, K,  BD, K,  _,  _,  _,  _,  _,  _],  # 21 boots
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

bs_f0 = copy_sprite(BLACKSMITH)
bs_f1 = copy_sprite(BLACKSMITH)
set_px(bs_f1, 7, 6, DT)    # blink
set_px(bs_f1, 12, 11, ST)  # hammer glint

sheet = hstack([bs_f0, bs_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_merchant_blacksmith.png'), sheet)


# ─── 6. ALCHEMIST ───────────────────────────────────────────────────────────
# Green hooded robe, holds flask with purple potion
# Colors: K, DF, FG, LG, MP, MV, PG, NW (8)

ALCHEMIST = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1  hood tip
    [_, _,  _,  _,  _,  K,  FG, FG, FG, K,  _,  _,  _,  _,  _,  _],  # 2  hood
    [_, _,  _,  _,  K,  FG, LG, LG, LG, FG, K,  _,  _,  _,  _,  _],  # 3  hood body
    [_, _,  _,  _,  K,  DF, FG, FG, FG, DF, K,  _,  _,  _,  _,  _],  # 4  hood shadow
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 5  face
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 7  chin
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 8  collar
    [_, _,  _,  _,  _,  K,  FG, FG, FG, K,  _,  _,  _,  _,  _,  _],  # 9  collar
    [_, _,  _,  _,  K,  FG, LG, FG, LG, FG, K,  _,  _,  _,  _,  _],  # 10 shoulders
    [_, _,  _,  _,  K,  FG, LG, FG, LG, FG, K,  NW, _,  _,  _,  _],  # 11 torso + flask top
    [_, _,  _,  _,  K,  DF, FG, LG, FG, DF, K,  MV, _,  _,  _,  _],  # 12 torso + flask body
    [_, _,  _,  _,  K,  DF, FG, LG, FG, DF, K,  MP, _,  _,  _,  _],  # 13 torso + flask bottom
    [_, _,  _,  _,  _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _,  _],  # 14 belt
    [_, _,  _,  _,  _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _,  _],  # 15 robe
    [_, _,  _,  _,  _,  K,  DF, FG, DF, K,  _,  _,  _,  _,  _,  _],  # 16 robe
    [_, _,  _,  _,  _,  K,  DF, DF, DF, K,  _,  _,  _,  _,  _,  _],  # 17 robe
    [_, _,  _,  _,  _,  K,  DF, DF, DF, K,  _,  _,  _,  _,  _,  _],  # 18 robe bottom
    [_, _,  _,  _,  _,  _,  K,  DF, K,  _,  _,  _,  _,  _,  _,  _],  # 19 hem
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 20 hem edge
    [_, _,  _,  _,  _,  K,  DF, K,  DF, K,  _,  _,  _,  _,  _,  _],  # 21 feet
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

al_f0 = copy_sprite(ALCHEMIST)
al_f1 = copy_sprite(ALCHEMIST)
set_px(al_f1, 11, 12, SG)  # potion bubbles glow
set_px(al_f1, 8, 6, PG)    # blink

sheet = hstack([al_f0, al_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_merchant_alchemist.png'), sheet)


# ─── 7. GENERAL TRADER ──────────────────────────────────────────────────────
# Warm brown hat, friendly outfit, satchel/backpack
# Colors: K, BN, SN, DS, PG, NW, DT, MG (8)

TRADER = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1  hat top
    [_, _,  _,  _,  _,  K,  BN, SN, BN, K,  _,  _,  _,  _,  _,  _],  # 2  hat body
    [_, _,  _,  _,  K,  K,  BN, BN, BN, K,  K,  _,  _,  _,  _,  _],  # 3  hat brim
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 4  forehead
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 5  face
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 7  mouth (smile)
    [_, _,  _,  _,  _,  _,  K,  PG, K,  _,  _,  _,  _,  _,  _,  _],  # 8  chin
    [_, _,  _,  _,  _,  K,  NW, NW, NW, K,  _,  _,  _,  _,  _,  _],  # 9  collar (white shirt)
    [_, _,  _,  _,  K,  SN, NW, SN, NW, SN, K,  _,  _,  _,  _,  _],  # 10 shoulders (vest)
    [_, _,  _,  MG, K,  SN, NW, SN, NW, SN, K,  _,  _,  _,  _,  _],  # 11 torso + satchel strap
    [_, _,  _,  MG, K,  BN, SN, NW, SN, BN, K,  _,  _,  _,  _,  _],  # 12 torso
    [_, _,  _,  K,  K,  BN, SN, DS, SN, BN, K,  _,  _,  _,  _,  _],  # 13 torso + belt buckle
    [_, _,  _,  _,  _,  K,  BN, SN, BN, K,  _,  _,  _,  _,  _,  _],  # 14 belt
    [_, _,  _,  _,  _,  K,  DT, BN, DT, K,  _,  _,  _,  _,  _,  _],  # 15 pants
    [_, _,  _,  _,  _,  K,  DT, BN, DT, K,  _,  _,  _,  _,  _,  _],  # 16 pants
    [_, _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _],  # 17 pants
    [_, _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _],  # 18 pants bottom
    [_, _,  _,  _,  _,  _,  K,  DT, K,  _,  _,  _,  _,  _,  _,  _],  # 19 ankle
    [_, _,  _,  _,  _,  K,  BN, K,  BN, K,  _,  _,  _,  _,  _,  _],  # 20 boots
    [_, _,  _,  _,  _,  K,  BN, K,  BN, K,  _,  _,  _,  _,  _,  _],  # 21 boots
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

tr_f0 = copy_sprite(TRADER)
tr_f1 = copy_sprite(TRADER)
set_px(tr_f1, 8, 6, PG)    # blink
set_px(tr_f1, 8, 13, GD)   # buckle glint

sheet = hstack([tr_f0, tr_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_merchant_trader.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# FACTION REPRESENTATIVE NPCs (16×24, 2 idle frames)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Faction Representatives ===')

# ─── 8. MERCHANTS GUILD REP ─────────────────────────────────────────────────
# Rich gold-trimmed outfit, medallion, distinguished
# Colors: K, DG, GD, YL, SN, PG, NW, BN (8)

MERCHANTS_GUILD = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1  fancy hat
    [_, _,  _,  _,  _,  K,  GD, YL, GD, K,  _,  _,  _,  _,  _,  _],  # 2  hat body
    [_, _,  _,  _,  K,  K,  DG, GD, DG, K,  K,  _,  _,  _,  _,  _],  # 3  hat brim + gold trim
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 4  forehead
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 5  face
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 7  mouth
    [_, _,  _,  _,  _,  _,  K,  BN, K,  _,  _,  _,  _,  _,  _,  _],  # 8  goatee
    [_, _,  _,  _,  _,  K,  SN, GD, SN, K,  _,  _,  _,  _,  _,  _],  # 9  collar + medallion
    [_, _,  _,  _,  K,  SN, GD, SN, GD, SN, K,  _,  _,  _,  _,  _],  # 10 shoulders (gold trim)
    [_, _,  _,  _,  K,  SN, NW, SN, NW, SN, K,  _,  _,  _,  _,  _],  # 11 torso
    [_, _,  _,  _,  K,  DG, SN, YL, SN, DG, K,  _,  _,  _,  _,  _],  # 12 torso + gem
    [_, _,  _,  _,  K,  DG, SN, SN, SN, DG, K,  _,  _,  _,  _,  _],  # 13 torso
    [_, _,  _,  _,  _,  K,  GD, DG, GD, K,  _,  _,  _,  _,  _,  _],  # 14 belt (gold)
    [_, _,  _,  _,  _,  K,  SN, DG, SN, K,  _,  _,  _,  _,  _,  _],  # 15 lower jacket
    [_, _,  _,  _,  _,  K,  SN, DG, SN, K,  _,  _,  _,  _,  _,  _],  # 16 jacket
    [_, _,  _,  _,  _,  K,  DG, DG, DG, K,  _,  _,  _,  _,  _,  _],  # 17 jacket bottom
    [_, _,  _,  _,  _,  K,  DG, DG, DG, K,  _,  _,  _,  _,  _,  _],  # 18 pants
    [_, _,  _,  _,  _,  _,  K,  DG, K,  _,  _,  _,  _,  _,  _,  _],  # 19 ankle
    [_, _,  _,  _,  _,  K,  BN, K,  BN, K,  _,  _,  _,  _,  _,  _],  # 20 boots
    [_, _,  _,  _,  _,  K,  BN, K,  BN, K,  _,  _,  _,  _,  _,  _],  # 21 boots
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

mg_f0 = copy_sprite(MERCHANTS_GUILD)
mg_f1 = copy_sprite(MERCHANTS_GUILD)
set_px(mg_f1, 8, 9, YL)    # medallion gleam
set_px(mg_f1, 8, 6, PG)    # blink

sheet = hstack([mg_f0, mg_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_faction_merchants.png'), sheet)


# ─── 9. MAGES CIRCLE REP ────────────────────────────────────────────────────
# Purple wizard robes, orb on staff, magical aura
# Colors: K, PM, MP, MV, SG, PG, NW, DK (8)

MAGES_CIRCLE = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  SG, _,  _,  _,  _],  # 0  orb glow
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  MV, K,  _,  _,  _],  # 1  orb on staff
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _],  # 2  staff
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  K,  _,  _,  _,  _],  # 3  hat tip + staff
    [_, _,  _,  _,  _,  K,  MP, MV, MP, K,  _,  K,  _,  _,  _,  _],  # 4  hat + staff
    [_, _,  _,  _,  K,  K,  MP, MP, MP, K,  K,  K,  _,  _,  _,  _],  # 5  hat brim + staff
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 6  face
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _],  # 7  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 8  chin
    [_, _,  _,  _,  _,  _,  K,  NW, K,  _,  _,  _,  _,  _,  _,  _],  # 9  beard
    [_, _,  _,  _,  _,  K,  MP, MV, MP, K,  _,  _,  _,  _,  _,  _],  # 10 collar
    [_, _,  _,  _,  K,  MP, MV, SG, MV, MP, K,  K,  _,  _,  _,  _],  # 11 shoulders + staff hand
    [_, _,  _,  _,  K,  PM, MP, MV, MP, PM, K,  K,  _,  _,  _,  _],  # 12 torso
    [_, _,  _,  _,  K,  PM, MP, MV, MP, PM, K,  _,  _,  _,  _,  _],  # 13 torso
    [_, _,  _,  _,  _,  K,  PM, MP, PM, K,  _,  _,  _,  _,  _,  _],  # 14 waist
    [_, _,  _,  _,  _,  K,  PM, MV, PM, K,  _,  _,  _,  _,  _,  _],  # 15 robe
    [_, _,  _,  _,  _,  K,  PM, MV, PM, K,  _,  _,  _,  _,  _,  _],  # 16 robe
    [_, _,  _,  _,  _,  K,  PM, MP, PM, K,  _,  _,  _,  _,  _,  _],  # 17 robe
    [_, _,  _,  _,  _,  K,  PM, PM, PM, K,  _,  _,  _,  _,  _,  _],  # 18 robe bottom
    [_, _,  _,  _,  _,  _,  K,  PM, K,  _,  _,  _,  _,  _,  _,  _],  # 19 hem
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 20 hem edge
    [_, _,  _,  _,  _,  K,  DK, K,  DK, K,  _,  _,  _,  _,  _,  _],  # 21 shoes
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

mc_f0 = copy_sprite(MAGES_CIRCLE)
mc_f1 = copy_sprite(MAGES_CIRCLE)
set_px(mc_f1, 11, 0, MV)   # orb pulse brighter
set_px(mc_f1, 11, 1, SG)   # orb glow
set_px(mc_f1, 7, 11, SG)   # arcane emblem glow

sheet = hstack([mc_f0, mc_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_faction_mages.png'), sheet)


# ─── 10. SHADOW BROTHERHOOD REP ─────────────────────────────────────────────
# Dark hooded cloak, red eyes/accents, stealthy
# Colors: K, DK, ST, DB, ER, BR, PG, MG (8)

SHADOW_BROTHERHOOD = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1  hood tip
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 2  hood
    [_, _,  _,  _,  K,  DK, ST, DK, ST, DK, K,  _,  _,  _,  _,  _],  # 3  hood body
    [_, _,  _,  _,  K,  DK, DK, DK, DK, DK, K,  _,  _,  _,  _,  _],  # 4  hood shadow
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 5  face shadow
    [_, _,  _,  _,  _,  K,  DK, ER, ER, K,  _,  _,  _,  _,  _,  _],  # 6  red eyes (menacing)
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 7  lower face (hidden)
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 8  mask edge
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 9  collar
    [_, _,  _,  _,  K,  DK, ST, DK, ST, DK, K,  _,  _,  _,  _,  _],  # 10 shoulders
    [_, _,  _,  K,  K,  DK, DK, ER, DK, DK, K,  K,  _,  _,  _,  _],  # 11 cloak + dagger cross
    [_, _,  _,  _,  K,  DK, DK, DK, DK, DK, K,  MG, _,  _,  _,  _],  # 12 cloak + dagger hilt
    [_, _,  _,  _,  K,  DK, DB, DK, DB, DK, K,  _,  _,  _,  _,  _],  # 13 cloak (blood accents)
    [_, _,  _,  _,  _,  K,  DK, ER, DK, K,  _,  _,  _,  _,  _,  _],  # 14 belt (red buckle)
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 15 cloak
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 16 cloak
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 17 cloak
    [_, _,  _,  _,  _,  K,  DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 18 cloak bottom
    [_, _,  _,  _,  _,  _,  K,  DK, K,  _,  _,  _,  _,  _,  _,  _],  # 19 cloak hem
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 20 cloak edge
    [_, _,  _,  _,  _,  K,  DK, K,  DK, K,  _,  _,  _,  _,  _,  _],  # 21 boots
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

sb_f0 = copy_sprite(SHADOW_BROTHERHOOD)
sb_f1 = copy_sprite(SHADOW_BROTHERHOOD)
set_px(sb_f1, 7, 6, BR)    # eyes flash brighter
set_px(sb_f1, 8, 6, BR)    # eyes flash
set_px(sb_f1, 11, 12, LS)  # dagger glint

sheet = hstack([sb_f0, sb_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_faction_shadow.png'), sheet)


# ─── 11. RANGERS ORDER REP ──────────────────────────────────────────────────
# Forest ranger outfit, bow across back, green/brown
# Colors: K, DF, FG, LG, BN, DT, PG, NW (8)

RANGERS_ORDER = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 2  ranger hat top
    [_, _,  _,  _,  K,  FG, FG, LG, FG, FG, K,  _,  _,  _,  _,  _],  # 3  hat body (feathered)
    [_, _,  _,  K,  K,  DF, FG, FG, FG, DF, K,  K,  _,  _,  _,  _],  # 4  hat brim (wide)
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 5  face
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _],  # 6  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 7  chin
    [_, _,  _,  _,  _,  _,  K,  PG, K,  _,  _,  _,  _,  _,  _,  _],  # 8  neck
    [_, _,  _,  _,  _,  K,  FG, FG, FG, K,  _,  _,  _,  _,  _,  _],  # 9  collar
    [_, _,  _,  _,  K,  FG, LG, FG, LG, FG, K,  BN, _,  _,  _,  _],  # 10 shoulders + bow (diagonal)
    [_, _,  _,  _,  K,  DF, FG, BN, FG, DF, K,  _,  BN, _,  _,  _],  # 11 torso + bow string
    [_, _,  _,  _,  K,  DF, FG, BN, FG, DF, K,  _,  _,  _,  _,  _],  # 12 torso + belt
    [_, _,  _,  _,  K,  DF, BN, DT, BN, DF, K,  _,  _,  _,  _,  _],  # 13 torso
    [_, _,  _,  _,  _,  K,  BN, DT, BN, K,  _,  _,  _,  _,  _,  _],  # 14 belt
    [_, _,  _,  _,  _,  K,  DT, BN, DT, K,  _,  _,  _,  _,  _,  _],  # 15 pants (leather)
    [_, _,  _,  _,  _,  K,  DT, BN, DT, K,  _,  _,  _,  _,  _,  _],  # 16 pants
    [_, _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _],  # 17 pants
    [_, _,  _,  _,  _,  K,  DT, DT, DT, K,  _,  _,  _,  _,  _,  _],  # 18 pants bottom
    [_, _,  _,  _,  _,  _,  K,  DT, K,  _,  _,  _,  _,  _,  _,  _],  # 19 ankle
    [_, _,  _,  _,  _,  K,  DF, K,  DF, K,  _,  _,  _,  _,  _,  _],  # 20 boots (green leather)
    [_, _,  _,  _,  _,  K,  DF, K,  DF, K,  _,  _,  _,  _,  _,  _],  # 21 boots
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

ro_f0 = copy_sprite(RANGERS_ORDER)
ro_f1 = copy_sprite(RANGERS_ORDER)
set_px(ro_f1, 8, 6, PG)    # blink
set_px(ro_f1, 7, 3, NW)    # feather shimmer

sheet = hstack([ro_f0, ro_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_faction_rangers.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSPORT NPC (16×24, 2 idle frames)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Transport NPC ===')

# Portal Keeper — mystical robes, crystal staff, purple/blue energy
# Colors: K, PM, MP, MV, SG, PB, PG, NW (8)

PORTAL_KEEPER = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  SG, _,  _,  _],  # 0  crystal glow
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  MV, K,  _,  _],  # 1  crystal on staff
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _],  # 2  staff shaft
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  K,  _,  _,  _],  # 3  hood + staff
    [_, _,  _,  _,  _,  K,  PB, PB, PB, K,  _,  _,  K,  _,  _,  _],  # 4  hood (blue energy)
    [_, _,  _,  _,  K,  K,  MP, MP, MP, K,  K,  _,  K,  _,  _,  _],  # 5  hood brim + staff
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 6  face
    [_, _,  _,  _,  _,  K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _],  # 7  eyes
    [_, _,  _,  _,  _,  K,  PG, PG, PG, K,  _,  _,  _,  _,  _,  _],  # 8  chin
    [_, _,  _,  _,  _,  _,  K,  NW, K,  _,  _,  _,  _,  _,  _,  _],  # 9  collar
    [_, _,  _,  _,  _,  K,  MP, MV, MP, K,  _,  _,  _,  _,  _,  _],  # 10 collar
    [_, _,  _,  _,  K,  MP, MV, SG, MV, MP, K,  K,  _,  _,  _,  _],  # 11 shoulders + staff hand
    [_, _,  _,  _,  K,  PM, MP, MV, MP, PM, K,  K,  _,  _,  _,  _],  # 12 torso
    [_, _,  _,  _,  K,  PM, MP, PB, MP, PM, K,  _,  _,  _,  _,  _],  # 13 torso (portal energy)
    [_, _,  _,  _,  _,  K,  PM, MV, PM, K,  _,  _,  _,  _,  _,  _],  # 14 waist
    [_, _,  _,  _,  _,  K,  PM, MP, PM, K,  _,  _,  _,  _,  _,  _],  # 15 robe
    [_, _,  _,  _,  _,  K,  PM, MV, PM, K,  _,  _,  _,  _,  _,  _],  # 16 robe
    [_, _,  _,  _,  _,  K,  PM, MP, PM, K,  _,  _,  _,  _,  _,  _],  # 17 robe
    [_, _,  _,  _,  _,  K,  PM, PM, PM, K,  _,  _,  _,  _,  _,  _],  # 18 robe bottom
    [_, _,  _,  _,  _,  _,  K,  PM, K,  _,  _,  _,  _,  _,  _,  _],  # 19 hem
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 20 hem edge
    [_, _,  _,  _,  _,  K,  PM, K,  PM, K,  _,  _,  _,  _,  _,  _],  # 21 shoes
    [_, _,  _,  _,  _,  K,  K,  _,  K,  K,  _,  _,  _,  _,  _,  _],  # 22 soles
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 23
]

pk_f0 = copy_sprite(PORTAL_KEEPER)
pk_f1 = copy_sprite(PORTAL_KEEPER)
set_px(pk_f1, 12, 0, MV)   # crystal pulse
set_px(pk_f1, 12, 1, SG)   # crystal glow brighter
set_px(pk_f1, 7, 13, PB)   # portal energy pulse on robes

sheet = hstack([pk_f0, pk_f1])
write_png(os.path.join(CHAR_DIR, 'char_npc_transport.png'), sheet)


# ═══════════════════════════════════════════════════════════════════════════════
# NPC INTERACTION INDICATORS (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== NPC Interaction Indicators ===')

# ─── Quest Available (!) — bright yellow exclamation mark ─────────────────────

QUEST_AVAILABLE = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 2
    [_, _,  _,  _,  _,  K,  YL, GD, YL, K,  _,  _,  _,  _,  _,  _],  # 3
    [_, _,  _,  _,  _,  K,  GD, YL, GD, K,  _,  _,  _,  _,  _,  _],  # 4
    [_, _,  _,  _,  _,  K,  YL, GD, YL, K,  _,  _,  _,  _,  _,  _],  # 5
    [_, _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _,  _],  # 6
    [_, _,  _,  _,  _,  _,  K,  YL, K,  _,  _,  _,  _,  _,  _,  _],  # 7
    [_, _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _,  _],  # 8
    [_, _,  _,  _,  _,  _,  K,  YL, K,  _,  _,  _,  _,  _,  _,  _],  # 9
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 10
    [_, _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _,  _],  # 11  dot
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 12
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(ICON_DIR, 'icon_npc_quest_available.png'), QUEST_AVAILABLE)


# ─── Quest In Progress (?) — yellow question mark ────────────────────────────

QUEST_PROGRESS = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 2
    [_, _,  _,  _,  K,  GD, YL, YL, YL, GD, K,  _,  _,  _,  _,  _],  # 3
    [_, _,  _,  _,  _,  K,  K,  K,  GD, YL, K,  _,  _,  _,  _,  _],  # 4
    [_, _,  _,  _,  _,  _,  _,  K,  YL, GD, K,  _,  _,  _,  _,  _],  # 5
    [_, _,  _,  _,  _,  _,  K,  GD, YL, K,  _,  _,  _,  _,  _,  _],  # 6
    [_, _,  _,  _,  _,  _,  K,  YL, GD, K,  _,  _,  _,  _,  _,  _],  # 7
    [_, _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _,  _],  # 8
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 9
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 10
    [_, _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _,  _],  # 11  dot
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 12
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(ICON_DIR, 'icon_npc_quest_progress.png'), QUEST_PROGRESS)


# ─── Merchant Indicator ($) — gold coin ──────────────────────────────────────

MERCHANT_INDICATOR = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 2
    [_, _,  _,  _,  _,  K,  GD, GD, GD, K,  _,  _,  _,  _,  _,  _],  # 3
    [_, _,  _,  _,  K,  GD, YL, GD, YL, GD, K,  _,  _,  _,  _,  _],  # 4  coin outer
    [_, _,  _,  _,  K,  GD, GD, YL, GD, GD, K,  _,  _,  _,  _,  _],  # 5  coin
    [_, _,  _,  _,  K,  YL, GD, DG, GD, YL, K,  _,  _,  _,  _,  _],  # 6  coin center ($)
    [_, _,  _,  _,  K,  GD, YL, DG, YL, GD, K,  _,  _,  _,  _,  _],  # 7  coin
    [_, _,  _,  _,  K,  GD, GD, DG, GD, GD, K,  _,  _,  _,  _,  _],  # 8  coin
    [_, _,  _,  _,  K,  GD, YL, GD, YL, GD, K,  _,  _,  _,  _,  _],  # 9  coin
    [_, _,  _,  _,  _,  K,  GD, GD, GD, K,  _,  _,  _,  _,  _,  _],  # 10 coin bottom
    [_, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 11
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 12
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(ICON_DIR, 'icon_npc_merchant_indicator.png'), MERCHANT_INDICATOR)


# ─── Faction Indicator (star emblem) — generic faction star ──────────────────

FACTION_INDICATOR = [
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 2  star top
    [_, _,  _,  _,  _,  _,  K,  MV, K,  _,  _,  _,  _,  _,  _,  _],  # 3
    [_, _,  _,  _,  _,  _,  K,  SG, K,  _,  _,  _,  _,  _,  _,  _],  # 4
    [_, _,  _,  K,  K,  K,  MV, SG, MV, K,  K,  K,  _,  _,  _,  _],  # 5  star arms
    [_, _,  _,  _,  K,  MP, SG, NW, SG, MP, K,  _,  _,  _,  _,  _],  # 6  star center
    [_, _,  _,  _,  _,  K,  MV, SG, MV, K,  _,  _,  _,  _,  _,  _],  # 7
    [_, _,  _,  _,  K,  MP, SG, NW, SG, MP, K,  _,  _,  _,  _,  _],  # 8  star center
    [_, _,  _,  K,  K,  K,  MV, SG, MV, K,  K,  K,  _,  _,  _,  _],  # 9  star arms
    [_, _,  _,  _,  _,  _,  K,  SG, K,  _,  _,  _,  _,  _,  _,  _],  # 10
    [_, _,  _,  _,  _,  _,  K,  MV, K,  _,  _,  _,  _,  _,  _,  _],  # 11
    [_, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 12  star bottom
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(ICON_DIR, 'icon_npc_faction_indicator.png'), FACTION_INDICATOR)


# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== NPC Variety Generation Complete ===')
print('  Quest Givers: 4 zone NPCs (80x24 each: 4 idle + 1 highlight)')
print('  Merchants:    3 types (32x24 each: 2 idle frames)')
print('  Factions:     4 reps (32x24 each: 2 idle frames)')
print('  Transport:    1 portal keeper (32x24: 2 idle frames)')
print('  Indicators:   4 icons (16x16 each)')
print('  Total:        16 new asset files')
