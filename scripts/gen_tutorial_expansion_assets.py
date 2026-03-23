#!/usr/bin/env python3
"""
Generate tutorial expansion art assets for PixelRealm (PIX-121).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}.{ext}

New tutorial system assets:
  assets/ui/tutorial/icon_tut_crafting.png      : 16×16   crafting tutorial icon (anvil)
  assets/ui/tutorial/icon_tut_skills.png        : 16×16   skill tree tutorial icon (star branch)
  assets/ui/tutorial/icon_tut_marketplace.png   : 16×16   marketplace tutorial icon (coin)
  assets/ui/tutorial/icon_tut_multiplayer.png   : 16×16   multiplayer tutorial icon (two figures)
  assets/ui/tutorial/icon_tut_complete.png      : 16×16   tutorial complete icon (trophy)
  assets/ui/tutorial/icon_step_recipe.png       : 16×16   crafting step: select recipe (scroll)
  assets/ui/tutorial/icon_step_gather.png       : 16×16   crafting step: gather materials (pickaxe)
  assets/ui/tutorial/icon_step_craft.png        : 16×16   crafting step: craft item (hammer+spark)
  assets/ui/tutorial/icon_step_equip.png        : 16×16   crafting step: equip result (sword)
  assets/ui/tutorial/ui_zone_warning.png        : 128×48  zone-level warning dialog frame
  assets/ui/tutorial/ui_reward_panel.png        : 128×64  tutorial completion reward panel
  assets/ui/tutorial/ui_tut_overlay_crafting.png : 160×48 crafting tutorial overlay panel
  assets/ui/tutorial/ui_tut_overlay_skills.png  : 160×48  skill tree tutorial overlay panel
  assets/ui/tutorial/ui_tut_overlay_market.png  : 160×48  marketplace tutorial overlay panel
  assets/ui/tutorial/ui_tut_overlay_multi.png   : 160×48  multiplayer tutorial overlay panel
  assets/ui/tutorial/ui_tut_steps_4.png         : 64×8    4-step progress (empty/active/done × 4)
  assets/ui/tutorial/ui_tut_steps_3.png         : 48×8    3-step progress (empty/active/done × 3)
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
TUT_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'tutorial')
os.makedirs(TUT_DIR, exist_ok=True)

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

# Semi-transparent helpers for overlays
HG  = (255, 224, 64,  128)  # half-alpha gold highlight
HW  = (240, 240, 240, 100)  # half-alpha white glow
LW  = (240, 240, 240, 60)   # low-alpha white glow
PB7 = (13, 13, 13, 200)     # panel background (dark, 78% opacity)
PB5 = (13, 13, 13, 140)     # lighter panel bg (55%)

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

def hstack(frames):
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def rect(grid, x, y, w, h, color):
    """Draw filled rectangle."""
    for dy in range(h):
        for dx in range(w):
            set_px(grid, x+dx, y+dy, color)

def rect_outline(grid, x, y, w, h, color):
    """Draw rectangle outline (1px border)."""
    for dx in range(w):
        set_px(grid, x+dx, y, color)
        set_px(grid, x+dx, y+h-1, color)
    for dy in range(h):
        set_px(grid, x, y+dy, color)
        set_px(grid, x+w-1, y+dy, color)

def hline(grid, x, y, length, color):
    for dx in range(length):
        set_px(grid, x+dx, y, color)

def vline(grid, x, y, length, color):
    for dy in range(length):
        set_px(grid, x, y+dy, color)

# ═══════════════════════════════════════════════════════════════════════════════
# 1. TUTORIAL SYSTEM ICONS (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Tutorial System Icons (16×16) ===')

# --- icon_tut_crafting.png: Anvil + Hammer ---
# Color: warm earth (crafting = earth tones) + fire orange spark
crafting_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  YL, _,  _],  # 0  spark
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  YL, FR, YL, _],  # 1  spark
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  _,  YL, _,  _],  # 2  hammer head top
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  K,  ST, MG, K,  _,  _,  _],  # 3  hammer head
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  MG, LS, ST, K,  _,  _,  _],  # 4  hammer head
    [ _, _,  _,  _,  _,  _,  _,  K,  BN, K,  K,  K,  _,  _,  _,  _],  # 5  handle joint
    [ _, _,  _,  _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _],  # 6  handle
    [ _, _,  _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _,  _],  # 7  handle
    [ _, _,  _,  _,  K,  BD, K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 8  handle end
    [ _, _,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _],  # 9  anvil top flat
    [ _, K,  ST, MG, MG, LS, LS, LS, LS, LS, MG, MG, ST, ST, K,  _],  # 10 anvil face
    [ _, K,  DK, ST, ST, MG, MG, MG, MG, MG, ST, ST, DK, DK, K,  _],  # 11 anvil body
    [ _, _,  K,  DK, ST, ST, ST, ST, ST, ST, ST, DK, K,  _,  _,  _],  # 12 anvil narrowing
    [ _, _,  _,  K,  DK, DK, ST, ST, ST, DK, DK, K,  _,  _,  _,  _],  # 13 anvil base narrow
    [ _, _,  K,  DK, DK, DK, DK, DK, DK, DK, DK, DK, K,  _,  _,  _],  # 14 anvil base wide
    [ _, _,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _],  # 15 anvil bottom
]
write_png(os.path.join(TUT_DIR, 'icon_tut_crafting.png'), crafting_icon)

# --- icon_tut_skills.png: Branching skill nodes ---
# Color: purple/magic (skills = magical knowledge)
skills_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  K,  K,  K,  _,  _],  # 1  top nodes
    [ _, K,  MV, SG, MV, K,  _,  _,  _,  _,  K,  MV, SG, MV, K,  _],  # 2
    [ _, _,  K,  MV, K,  _,  _,  _,  _,  _,  _,  K,  MV, K,  _,  _],  # 3
    [ _, _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _],  # 4  connectors down
    [ _, _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 6  horizontal bar
    [ _, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 7  center connector
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 8  center node outline
    [ _, _,  _,  _,  K,  GD, YL, YL, YL, GD, K,  _,  _,  _,  _,  _],  # 9  center node (gold=active)
    [ _, _,  _,  _,  _,  K,  GD, YL, GD, K,  _,  _,  _,  _,  _,  _],  # 10
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 11
    [ _, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 12 connector down
    [ _, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [ _, _,  _,  _,  _,  _,  K,  MP, K,  _,  _,  _,  _,  _,  _,  _],  # 14 bottom node (locked)
    [ _, _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_tut_skills.png'), skills_icon)

# --- icon_tut_marketplace.png: Gold coin + price tag ---
# Color: gold/yellow (marketplace = commerce)
market_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1  coin top
    [ _, _,  _,  K,  GD, GD, YL, GD, GD, K,  _,  _,  _,  _,  _,  _],  # 2
    [ _, _,  K,  GD, YL, GD, DG, GD, YL, GD, K,  _,  _,  _,  _,  _],  # 3  coin face
    [ _, _,  K,  GD, GD, K,  DG, K,  GD, GD, K,  _,  _,  _,  _,  _],  # 4  G emblem
    [ _, _,  K,  YL, GD, K,  _,  _,  GD, YL, K,  _,  _,  _,  _,  _],  # 5
    [ _, _,  K,  GD, GD, K,  DG, K,  GD, GD, K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  K,  GD, YL, GD, DG, GD, YL, GD, K,  _,  _,  _,  _,  _],  # 7
    [ _, _,  _,  K,  GD, GD, YL, GD, GD, K,  _,  _,  _,  _,  _,  _],  # 8
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  K,  K,  K,  K,  _],  # 9  tag top
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  PG, NW, PG, K,  K],  # 10 price tag
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  NW, K,  NW, PG, K],  # 11
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  PG, NW, PG, K,  K],  # 12
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  _],  # 13
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_tut_marketplace.png'), market_icon)

# --- icon_tut_multiplayer.png: Two player figures ---
# Color: cyan/blue (player = friendly blue)
multi_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  K,  K,  K,  _,  _],  # 1  heads
    [ _, K,  PG, NW, PG, K,  _,  _,  _,  _,  K,  PG, NW, PG, K,  _],  # 2
    [ _, K,  PG, K,  PG, K,  _,  _,  _,  _,  K,  PG, K,  PG, K,  _],  # 3  eyes
    [ _, _,  K,  PG, K,  _,  _,  _,  _,  _,  _,  K,  PG, K,  _,  _],  # 4
    [ _, _,  K,  PB, K,  _,  _,  _,  _,  _,  _,  K,  SB, K,  _,  _],  # 5  shirts (diff blues)
    [ _, K,  PB, HB, PB, K,  _,  _,  _,  _,  K,  SB, PB, SB, K,  _],  # 6
    [ _, K,  DP, PB, DP, K,  _,  _,  _,  _,  K,  DP, SB, DP, K,  _],  # 7  torso
    [ _, K,  PB, PB, PB, K,  _,  _,  _,  _,  K,  SB, SB, SB, K,  _],  # 8
    [ _, _,  K,  PB, K,  _,  _,  _,  _,  _,  _,  K,  SB, K,  _,  _],  # 9
    [ _, _,  K,  DK, K,  _,  _,  _,  _,  _,  _,  K,  DK, K,  _,  _],  # 10 pants
    [ _, _,  K,  DK, K,  _,  _,  _,  _,  _,  _,  K,  DK, K,  _,  _],  # 11
    [ _, K,  DK, _,  DK, K,  _,  _,  _,  _,  K,  DK, _,  DK, K,  _],  # 12 legs apart
    [ _, K,  K,  _,  K,  K,  _,  _,  _,  _,  K,  K,  _,  K,  K,  _],  # 13 feet
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_tut_multiplayer.png'), multi_icon)

# --- icon_tut_complete.png: Trophy / completion star ---
# Color: gold + bright yellow (achievement/reward)
complete_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  PY, _,  _,  _,  _,  _,  _,  _,  _],  # 0  star top
    [ _, _,  _,  _,  _,  _,  _,  YL, _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  PY, _,  _,  _,  YL, GD, YL, _,  _,  _,  PY, _,  _,  _],  # 2  rays
    [ _, _,  _,  YL, _,  K,  K,  GD, K,  K,  _,  YL, _,  _,  _,  _],  # 3  cup top
    [ _, _,  _,  _,  K,  GD, YL, PY, YL, GD, K,  _,  _,  _,  _,  _],  # 4  cup
    [ _, _,  _,  K,  DG, GD, YL, YL, YL, GD, DG, K,  _,  _,  _,  _],  # 5
    [ _, _,  K,  DG, GD, GD, YL, YL, YL, GD, GD, DG, K,  _,  _,  _],  # 6  cup widest
    [ _, K,  DG, GD, GD, YL, PY, PY, PY, YL, GD, GD, DG, K,  _,  _],  # 7  cup body + handles
    [ _, K,  DG, GD, GD, YL, GD, GD, GD, YL, GD, GD, DG, K,  _,  _],  # 8
    [ _, _,  K,  DG, GD, GD, GD, GD, GD, GD, GD, DG, K,  _,  _,  _],  # 9
    [ _, _,  _,  K,  DG, GD, GD, GD, GD, GD, DG, K,  _,  _,  _,  _],  # 10 cup narrowing
    [ _, _,  _,  _,  K,  DG, GD, GD, GD, DG, K,  _,  _,  _,  _,  _],  # 11
    [ _, _,  _,  _,  _,  K,  K,  GD, K,  K,  _,  _,  _,  _,  _,  _],  # 12 stem
    [ _, _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _,  _],  # 13
    [ _, _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 14 base
    [ _, _,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_tut_complete.png'), complete_icon)

# ═══════════════════════════════════════════════════════════════════════════════
# 2. CRAFTING TUTORIAL STEP ICONS (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Crafting Step Icons (16×16) ===')

# --- icon_step_recipe.png: Scroll/recipe ---
recipe_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],  # 0  scroll top curl
    [ _, _,  K,  PS, PS, SN, SN, SN, SN, SN, PS, PS, K,  _,  _,  _],  # 1
    [ _, _,  K,  SN, K,  K,  K,  K,  K,  K,  K,  SN, K,  _,  _,  _],  # 2  text lines
    [ _, _,  K,  SN, _,  _,  _,  _,  _,  _,  _,  SN, K,  _,  _,  _],  # 3
    [ _, _,  K,  SN, _,  K,  K,  K,  K,  K,  _,  SN, K,  _,  _,  _],  # 4  text line
    [ _, _,  K,  SN, _,  _,  _,  _,  _,  _,  _,  SN, K,  _,  _,  _],  # 5
    [ _, _,  K,  SN, _,  K,  K,  K,  K,  _,  _,  SN, K,  _,  _,  _],  # 6  text line
    [ _, _,  K,  SN, _,  _,  _,  _,  _,  _,  _,  SN, K,  _,  _,  _],  # 7
    [ _, _,  K,  SN, _,  K,  K,  K,  K,  K,  K,  SN, K,  _,  _,  _],  # 8  text line
    [ _, _,  K,  SN, _,  _,  _,  _,  _,  _,  _,  SN, K,  _,  _,  _],  # 9
    [ _, _,  K,  SN, _,  FR, _,  GD, _,  FR, _,  SN, K,  _,  _,  _],  # 10 icons (ingredients)
    [ _, _,  K,  SN, _,  _,  _,  _,  _,  _,  _,  SN, K,  _,  _,  _],  # 11
    [ _, _,  K,  PS, SN, SN, SN, SN, SN, SN, SN, PS, K,  _,  _,  _],  # 12
    [ _, _,  _,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],  # 13 scroll bottom curl
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_step_recipe.png'), recipe_icon)

# --- icon_step_gather.png: Pickaxe ---
gather_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  _,  _],  # 0  pick head
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  ST, MG, LS, K,  _],  # 1
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  K,  MG, LS, K,  K,  _,  _],  # 2  pick point
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  LS, MG, K,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  _,  _,  _,  K,  BN, K,  K,  _,  _,  _,  _,  _],  # 4  handle top
    [ _, _,  _,  _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _,  _],  # 6  handle mid
    [ _, _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 7
    [ _, _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 8
    [ _, _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  LG, _,  _,  _,  _],  # 9  handle + gems
    [ _, K,  BD, BN, K,  _,  _,  _,  _,  _,  LG, FG, LG, _,  _,  _],  # 10
    [ _, _,  K,  K,  _,  _,  _,  _,  _,  LG, FG, DF, FG, LG, _,  _],  # 11 material ore
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  K,  FG, LG, FG, K,  K,  _],  # 12 rock base
    [ _, _,  _,  _,  _,  _,  _,  K,  DK, ST, K,  K,  K,  ST, DK, K],  # 13
    [ _, _,  _,  _,  _,  _,  K,  DK, ST, ST, DK, DK, DK, ST, DK, K],  # 14
    [ _, _,  _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  K,  K,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_step_gather.png'), gather_icon)

# --- icon_step_craft.png: Hammer + spark (action) ---
craft_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  YL, _,  YL, _],  # 0  sparks
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  PY, _,  _],  # 1
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  YL, _,  _,  _],  # 2  hammer head
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  MG, LS, MG, K,  _,  _,  _],  # 3
    [ _, _,  _,  _,  _,  _,  _,  K,  ST, MG, LS, ST, K,  _,  _,  _],  # 4
    [ _, _,  _,  _,  _,  _,  K,  BN, K,  K,  K,  K,  _,  _,  _,  _],  # 5  handle
    [ _, _,  _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _,  _],  # 6
    [ _, _,  _,  _,  K,  BN, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 7
    [ _, _,  _,  K,  BD, BN, K,  _,  _,  _,  _,  FR, YL, FR, _,  _],  # 8  sparks right
    [ _, _,  _,  _,  K,  K,  _,  _,  _,  _,  YL, FR, PY, FR, YL, _],  # 9
    [ _, _,  K,  K,  K,  K,  K,  K,  K,  K,  _,  FR, YL, FR, _,  _],  # 10 workpiece
    [ _, K,  ST, MG, MG, LS, MG, MG, ST, DK, K,  _,  _,  _,  _,  _],  # 11
    [ _, _,  K,  DK, ST, ST, ST, ST, DK, K,  _,  _,  _,  _,  _,  _],  # 12 anvil
    [ _, _,  K,  DK, DK, DK, DK, DK, DK, K,  _,  _,  _,  _,  _,  _],  # 13
    [ _, K,  K,  DK, DK, DK, DK, DK, DK, K,  K,  _,  _,  _,  _,  _],  # 14 anvil base
    [ _, K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_step_craft.png'), craft_icon)

# --- icon_step_equip.png: Sword equip ---
equip_icon = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  NW, _],  # 0  sword tip
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  LS, K,  _],  # 1
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  LS, MG, K,  _],  # 2  blade
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  LS, MG, K,  _,  _],  # 3
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  K,  LS, MG, K,  _,  _,  _],  # 4
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  MG, LS, K,  _,  _,  _,  _],  # 5
    [ _, _,  _,  _,  _,  _,  _,  K,  MG, LS, K,  _,  _,  _,  _,  _],  # 6
    [ _, _,  _,  _,  _,  _,  K,  MG, LS, K,  _,  _,  _,  _,  _,  _],  # 7
    [ _, _,  _,  _,  _,  K,  GD, K,  K,  GD, K,  _,  _,  _,  _,  _],  # 8  crossguard
    [ _, _,  _,  _,  K,  GD, YL, GD, GD, YL, GD, K,  _,  _,  _,  _],  # 9
    [ _, _,  _,  _,  _,  K,  K,  BN, K,  K,  _,  _,  _,  _,  _,  _],  # 10 grip
    [ _, _,  _,  _,  _,  _,  K,  DT, K,  _,  _,  _,  _,  _,  _,  _],  # 11
    [ _, _,  _,  _,  _,  _,  K,  BN, K,  _,  _,  _,  _,  _,  _,  _],  # 12
    [ _, _,  _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _,  _,  _,  _],  # 13 pommel
    [ _, _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _],  # 14
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]
write_png(os.path.join(TUT_DIR, 'icon_step_equip.png'), equip_icon)

# ═══════════════════════════════════════════════════════════════════════════════
# 3. ZONE LEVEL WARNING DIALOG (128×48)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Zone Warning Dialog (128x48) ===')

# Red-bordered danger dialog with skull/danger icon area
zone_warn = blank(128, 48, PB7)

# Outer border — red for danger
rect_outline(zone_warn, 0, 0, 128, 48, ER)
rect_outline(zone_warn, 1, 1, 126, 46, BR)
rect_outline(zone_warn, 2, 2, 124, 44, K)

# Inner panel fill (dark)
rect(zone_warn, 3, 3, 122, 42, PB7)

# Danger stripe accents (top-left and top-right corners)
for i in range(4):
    set_px(zone_warn, 4+i, 4, FR)
    set_px(zone_warn, 5+i, 5, FR)
    set_px(zone_warn, 123-i, 4, FR)
    set_px(zone_warn, 122-i, 5, FR)

# Skull/danger icon area (left side, ~16x16 at position 6,10)
# Simplified skull silhouette
skull_x, skull_y = 8, 12
# Skull top
for dx in range(8):
    set_px(zone_warn, skull_x+dx, skull_y, K)
set_px(zone_warn, skull_x-1, skull_y+1, K)
for dx in range(10):
    set_px(zone_warn, skull_x-1+dx, skull_y+1, NW if 1 <= dx <= 8 else K)
for dy in range(2, 5):
    set_px(zone_warn, skull_x-1, skull_y+dy, K)
    set_px(zone_warn, skull_x+8, skull_y+dy, K)
    for dx in range(8):
        set_px(zone_warn, skull_x+dx, skull_y+dy, NW)
# Eyes (dark)
set_px(zone_warn, skull_x+1, skull_y+3, K)
set_px(zone_warn, skull_x+2, skull_y+3, K)
set_px(zone_warn, skull_x+5, skull_y+3, K)
set_px(zone_warn, skull_x+6, skull_y+3, K)
set_px(zone_warn, skull_x+1, skull_y+4, K)
set_px(zone_warn, skull_x+2, skull_y+4, ER)
set_px(zone_warn, skull_x+5, skull_y+4, ER)
set_px(zone_warn, skull_x+6, skull_y+4, K)
# Nose
set_px(zone_warn, skull_x+3, skull_y+5, K)
set_px(zone_warn, skull_x+4, skull_y+5, K)
# Jaw
for dx in range(8):
    set_px(zone_warn, skull_x+dx, skull_y+6, NW)
set_px(zone_warn, skull_x-1, skull_y+6, K)
set_px(zone_warn, skull_x+8, skull_y+6, K)
# Teeth
for dx in range(8):
    color = NW if dx % 2 == 0 else K
    set_px(zone_warn, skull_x+dx, skull_y+7, color)
for dx in range(6):
    set_px(zone_warn, skull_x+1+dx, skull_y+8, K)

# Crossbones below skull
set_px(zone_warn, skull_x-1, skull_y+10, NW)
set_px(zone_warn, skull_x+8, skull_y+10, NW)
set_px(zone_warn, skull_x, skull_y+11, NW)
set_px(zone_warn, skull_x+7, skull_y+11, NW)
for dx in range(6):
    set_px(zone_warn, skull_x+1+dx, skull_y+12, NW)
set_px(zone_warn, skull_x, skull_y+13, NW)
set_px(zone_warn, skull_x+7, skull_y+13, NW)
set_px(zone_warn, skull_x-1, skull_y+14, NW)
set_px(zone_warn, skull_x+8, skull_y+14, NW)

# Separator line between icon and text area
vline(zone_warn, 24, 6, 36, ST)
vline(zone_warn, 25, 6, 36, DK)

# Warning exclamation marks (red, right side accent)
for y_off in [8, 10, 12]:
    set_px(zone_warn, 120, y_off, BR)
    set_px(zone_warn, 121, y_off, BR)
set_px(zone_warn, 120, 14, BR)
set_px(zone_warn, 121, 14, BR)

# Bottom accent bar (red gradient)
for x in range(4, 124):
    set_px(zone_warn, x, 43, ER)
    set_px(zone_warn, x, 44, DB)

write_png(os.path.join(TUT_DIR, 'ui_zone_warning.png'), zone_warn)

# ═══════════════════════════════════════════════════════════════════════════════
# 4. TUTORIAL COMPLETION REWARD PANEL (128×64)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Reward Panel (128x64) ===')

reward = blank(128, 64, PB7)

# Outer border — gold for reward/celebration
rect_outline(reward, 0, 0, 128, 64, DG)
rect_outline(reward, 1, 1, 126, 62, GD)
rect_outline(reward, 2, 2, 124, 60, K)

# Inner fill
rect(reward, 3, 3, 122, 58, PB7)

# Gold corner decorations (star sparkles)
corners = [(5, 5), (120, 5), (5, 56), (120, 56)]
for cx, cy in corners:
    set_px(reward, cx, cy, YL)
    set_px(reward, cx-1, cy, GD)
    set_px(reward, cx+1, cy, GD)
    set_px(reward, cx, cy-1, GD)
    set_px(reward, cx, cy+1, GD)

# Trophy icon area (center-left, 12x14)
trophy_x, trophy_y = 10, 10
# Cup
for dx in range(-1, 8):
    set_px(reward, trophy_x+dx, trophy_y, K)
for dy in range(1, 6):
    set_px(reward, trophy_x-1, trophy_y+dy, K)
    set_px(reward, trophy_x+7, trophy_y+dy, K)
    for dx in range(7):
        set_px(reward, trophy_x+dx, trophy_y+dy, GD if dy < 3 else DG)
# Highlight
set_px(reward, trophy_x+1, trophy_y+1, YL)
set_px(reward, trophy_x+2, trophy_y+1, PY)
set_px(reward, trophy_x+1, trophy_y+2, PY)
# Handles
set_px(reward, trophy_x-2, trophy_y+1, K)
set_px(reward, trophy_x-2, trophy_y+2, K)
set_px(reward, trophy_x-2, trophy_y+3, K)
set_px(reward, trophy_x-1, trophy_y+3, K)
set_px(reward, trophy_x+8, trophy_y+1, K)
set_px(reward, trophy_x+8, trophy_y+2, K)
set_px(reward, trophy_x+8, trophy_y+3, K)
set_px(reward, trophy_x+7, trophy_y+3, K)
# Stem
for dy in range(6, 9):
    set_px(reward, trophy_x+2, trophy_y+dy, K)
    set_px(reward, trophy_x+3, trophy_y+dy, GD)
    set_px(reward, trophy_x+4, trophy_y+dy, K)
# Base
for dx in range(-1, 8):
    set_px(reward, trophy_x+dx, trophy_y+9, K)
for dx in range(0, 7):
    set_px(reward, trophy_x+dx, trophy_y+10, DG)
for dx in range(-1, 8):
    set_px(reward, trophy_x+dx, trophy_y+11, K)

# XP orbs (small yellow dots in reward area, right side)
xp_positions = [(90, 14), (95, 12), (100, 15), (105, 13), (110, 11)]
for xp_x, xp_y in xp_positions:
    set_px(reward, xp_x, xp_y, YL)
    set_px(reward, xp_x+1, xp_y, GD)
    set_px(reward, xp_x, xp_y+1, GD)
    set_px(reward, xp_x+1, xp_y+1, DG)

# Item slots (3 reward item placeholders, bottom area)
for slot_i in range(3):
    sx = 40 + slot_i * 24
    sy = 36
    rect_outline(reward, sx, sy, 18, 18, ST)
    rect(reward, sx+1, sy+1, 16, 16, DK)
    # Item silhouette placeholder (different color per slot)
    colors = [(LG, FG), (PB, DP), (GD, DG)]  # green item, blue item, gold item
    c1, c2 = colors[slot_i]
    rect(reward, sx+4, sy+4, 10, 10, c2)
    rect(reward, sx+5, sy+5, 8, 8, c1)

# Separator between trophy and text area
vline(reward, 28, 6, 52, ST)
vline(reward, 29, 6, 52, DK)

# Stars across top
star_xs = [30, 50, 70, 90, 110]
for sx in star_xs:
    set_px(reward, sx, 6, PY)
    set_px(reward, sx-1, 7, YL)
    set_px(reward, sx, 7, PY)
    set_px(reward, sx+1, 7, YL)
    set_px(reward, sx, 8, YL)

write_png(os.path.join(TUT_DIR, 'ui_reward_panel.png'), reward)

# ═══════════════════════════════════════════════════════════════════════════════
# 5. TUTORIAL OVERLAY PANELS (160×48 each) — one per system
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Tutorial Overlay Panels (160x48) ===')

def make_tutorial_overlay(accent_color, accent_dark, icon_color, icon_dark):
    """Create a 160×48 tutorial overlay panel with colored accent."""
    panel = blank(160, 48, PB7)

    # Border
    rect_outline(panel, 0, 0, 160, 48, K)
    rect_outline(panel, 1, 1, 158, 46, accent_dark)

    # Inner fill
    rect(panel, 2, 2, 156, 44, PB7)

    # Left accent bar (colored stripe for tutorial type identification)
    rect(panel, 2, 2, 4, 44, accent_dark)
    rect(panel, 3, 3, 2, 42, accent_color)

    # Icon area background (left side)
    rect_outline(panel, 8, 8, 20, 20, accent_dark)
    rect(panel, 9, 9, 18, 18, DK)

    # Icon placeholder (colored diamond shape)
    cx, cy = 18, 18  # center of icon area
    for d in range(4):
        set_px(panel, cx, cy-d, icon_color)
        set_px(panel, cx, cy+d, icon_color)
        set_px(panel, cx-d, cy, icon_color)
        set_px(panel, cx+d, cy, icon_color)
    for d in range(2):
        set_px(panel, cx-d, cy-d, icon_dark)
        set_px(panel, cx+d, cy-d, icon_dark)

    # Top accent line (after icon area)
    hline(panel, 30, 4, 126, accent_dark)
    hline(panel, 30, 5, 126, accent_color)

    # Step indicator dots area (bottom right)
    for i in range(4):
        dot_x = 130 + i * 7
        dot_y = 40
        set_px(panel, dot_x, dot_y, ST)
        set_px(panel, dot_x+1, dot_y, ST)
        set_px(panel, dot_x, dot_y+1, ST)
        set_px(panel, dot_x+1, dot_y+1, ST)

    # Bottom border accent
    hline(panel, 2, 45, 156, accent_dark)

    return panel

# Crafting overlay: warm earth tones (crafting = earth/fire)
crafting_overlay = make_tutorial_overlay(FR, DG, SN, BN)
write_png(os.path.join(TUT_DIR, 'ui_tut_overlay_crafting.png'), crafting_overlay)

# Skill tree overlay: purple/magic
skills_overlay = make_tutorial_overlay(MV, PM, SG, MP)
write_png(os.path.join(TUT_DIR, 'ui_tut_overlay_skills.png'), skills_overlay)

# Marketplace overlay: gold
market_overlay = make_tutorial_overlay(GD, DG, YL, GD)
write_png(os.path.join(TUT_DIR, 'ui_tut_overlay_market.png'), market_overlay)

# Multiplayer overlay: cyan/blue (player/friendly)
multi_overlay = make_tutorial_overlay(PB, DP, HB, SB)
write_png(os.path.join(TUT_DIR, 'ui_tut_overlay_multi.png'), multi_overlay)

# ═══════════════════════════════════════════════════════════════════════════════
# 6. STEP PROGRESS INDICATORS
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Step Progress Indicators ===')

def make_step_progress(num_steps):
    """Create step progress: num_steps × 3 states (empty, active, done) stacked.
    Width = num_steps * 16, Height = 8 × 3 = 24 (3 rows for 3 states)."""
    w = num_steps * 16
    h = 24  # 3 states × 8px each

    grid = blank(w, h)

    for state in range(3):
        y_off = state * 8
        for step in range(num_steps):
            x_off = step * 16

            # Dot background circle (6px diameter centered in 16×8)
            cx, cy = x_off + 8, y_off + 4

            if state == 0:
                # Empty: gray outline
                for dx in [-2, -1, 0, 1, 2]:
                    set_px(grid, cx+dx, cy-2, ST)
                    set_px(grid, cx+dx, cy+2, ST)
                set_px(grid, cx-3, cy-1, ST)
                set_px(grid, cx-3, cy, ST)
                set_px(grid, cx-3, cy+1, ST)
                set_px(grid, cx+3, cy-1, ST)
                set_px(grid, cx+3, cy, ST)
                set_px(grid, cx+3, cy+1, ST)
            elif state == 1:
                # Active: gold filled, pulsing
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        set_px(grid, cx+dx, cy+dy, GD)
                for dx in [-3, 3]:
                    for dy in [-1, 0, 1]:
                        set_px(grid, cx+dx, cy+dy, DG)
                for dy in [-3, 3]:
                    for dx in [-1, 0, 1]:
                        set_px(grid, cx+dx, cy+dy, DG)
                # Bright center
                set_px(grid, cx, cy, YL)
                set_px(grid, cx-1, cy, YL)
                set_px(grid, cx+1, cy, YL)
                set_px(grid, cx, cy-1, YL)
            elif state == 2:
                # Done: green filled with checkmark
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        set_px(grid, cx+dx, cy+dy, FG)
                for dx in [-3, 3]:
                    for dy in [-1, 0, 1]:
                        set_px(grid, cx+dx, cy+dy, DF)
                for dy in [-3, 3]:
                    for dx in [-1, 0, 1]:
                        set_px(grid, cx+dx, cy+dy, DF)
                # Checkmark
                set_px(grid, cx-2, cy, NW)
                set_px(grid, cx-1, cy+1, NW)
                set_px(grid, cx, cy, NW)
                set_px(grid, cx+1, cy-1, NW)
                set_px(grid, cx+2, cy-2, NW)

            # Connector between dots (except last)
            if step < num_steps - 1:
                hline(grid, x_off + 12, y_off + 4, 8, ST if state == 0 else (GD if state == 1 else FG))

    return grid

# 4-step progress (for crafting: recipe → gather → craft → equip)
steps_4 = make_step_progress(4)
write_png(os.path.join(TUT_DIR, 'ui_tut_steps_4.png'), steps_4)

# 3-step progress (for marketplace: list → buy → fees)
steps_3 = make_step_progress(3)
write_png(os.path.join(TUT_DIR, 'ui_tut_steps_3.png'), steps_3)

# ═══════════════════════════════════════════════════════════════════════════════
# 7. ADDITIONAL KEY ICONS FOR NEW TUTORIALS
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Additional Key Icons ===')

def make_key_icon(letter_pixels, width=16, height=16):
    """Create a keyboard key icon with the given letter pattern.
    letter_pixels: list of (x, y) positions for the letter within a 6x6 area centered in key."""
    grid = blank(width, height)

    # Key background (rounded rectangle)
    rect(grid, 2, 1, 12, 13, DK)
    rect(grid, 3, 0, 10, 15, DK)
    rect(grid, 1, 2, 14, 11, DK)

    # Key face (lighter inner)
    rect(grid, 3, 1, 10, 12, ST)
    rect(grid, 2, 2, 12, 10, ST)

    # Key top highlight
    hline(grid, 4, 2, 8, MG)
    hline(grid, 3, 3, 10, MG)

    # Key bottom shadow
    hline(grid, 3, 12, 10, DK)
    hline(grid, 4, 13, 8, K)

    # Letter
    for lx, ly in letter_pixels:
        set_px(grid, 5+lx, 4+ly, NW)

    return grid

# icon_key_i.png (Inventory)
i_letter = [(2,0),(3,0),(4,0), (3,1), (3,2), (3,3), (3,4), (2,5),(3,5),(4,5)]
key_i = make_key_icon(i_letter)
write_png(os.path.join(TUT_DIR, 'icon_key_i.png'), key_i)

# icon_key_k.png (Skill tree)
k_letter = [(1,0),(1,1),(1,2),(1,3),(1,4),(1,5), (4,0),(3,1),(2,2),(2,3),(3,4),(4,5)]
key_k = make_key_icon(k_letter)
write_png(os.path.join(TUT_DIR, 'icon_key_k.png'), key_k)

# icon_key_t.png (Trade/marketplace)
t_letter = [(1,0),(2,0),(3,0),(4,0),(5,0), (3,1),(3,2),(3,3),(3,4),(3,5)]
key_t = make_key_icon(t_letter)
write_png(os.path.join(TUT_DIR, 'icon_key_t.png'), key_t)

# icon_key_p.png (Party)
p_letter = [(1,0),(2,0),(3,0),(4,0), (1,1),(4,1), (1,2),(2,2),(3,2),(4,2), (1,3),(1,4),(1,5)]
key_p = make_key_icon(p_letter)
write_png(os.path.join(TUT_DIR, 'icon_key_p.png'), key_p)

# icon_key_g.png (Guild)
g_letter = [(2,0),(3,0),(4,0), (1,1), (1,2),(3,2),(4,2), (1,3),(4,3), (2,4),(3,4),(4,4)]
key_g = make_key_icon(g_letter)
write_png(os.path.join(TUT_DIR, 'icon_key_g.png'), key_g)

# icon_key_c.png (Chat)
c_letter = [(2,0),(3,0),(4,0), (1,1), (1,2), (1,3), (2,4),(3,4),(4,4)]
key_c = make_key_icon(c_letter)
write_png(os.path.join(TUT_DIR, 'icon_key_c.png'), key_c)

# icon_key_enter.png (24×16 wide key, like shift)
enter_grid = blank(24, 16)
# Key background
rect(enter_grid, 2, 1, 20, 13, DK)
rect(enter_grid, 3, 0, 18, 15, DK)
rect(enter_grid, 1, 2, 22, 11, DK)
# Key face
rect(enter_grid, 3, 1, 18, 12, ST)
rect(enter_grid, 2, 2, 20, 10, ST)
# Highlight
hline(enter_grid, 4, 2, 16, MG)
hline(enter_grid, 3, 3, 18, MG)
# Shadow
hline(enter_grid, 3, 12, 18, DK)
hline(enter_grid, 4, 13, 16, K)
# Arrow symbol (enter/return)
# Horizontal line
hline(enter_grid, 7, 7, 8, NW)
# Down bend
vline(enter_grid, 14, 5, 3, NW)
# Arrow head
set_px(enter_grid, 8, 6, NW)
set_px(enter_grid, 8, 8, NW)
set_px(enter_grid, 7, 7, NW)

write_png(os.path.join(TUT_DIR, 'icon_key_enter.png'), enter_grid)

# ═══════════════════════════════════════════════════════════════════════════════
# 8. ONLINE PLAYERS INDICATOR (32×16)
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Multiplayer Online Indicator ===')

# Small "players online" badge with wifi/signal dots
online_badge = blank(32, 16, PB5)
rect_outline(online_badge, 0, 0, 32, 16, DP)
rect(online_badge, 1, 1, 30, 14, PB7)

# Green dot (online status)
set_px(online_badge, 4, 7, LG)
set_px(online_badge, 5, 7, BG)
set_px(online_badge, 4, 8, FG)
set_px(online_badge, 5, 8, LG)

# Mini person silhouette
set_px(online_badge, 9, 5, PB)
set_px(online_badge, 10, 5, PB)
set_px(online_badge, 9, 6, PB)
set_px(online_badge, 10, 6, PB)
set_px(online_badge, 9, 7, SB)
set_px(online_badge, 10, 7, SB)
set_px(online_badge, 8, 8, SB)
set_px(online_badge, 9, 8, PB)
set_px(online_badge, 10, 8, PB)
set_px(online_badge, 11, 8, SB)
set_px(online_badge, 9, 9, DP)
set_px(online_badge, 10, 9, DP)

# Second person (slightly behind)
set_px(online_badge, 14, 6, PB)
set_px(online_badge, 15, 6, PB)
set_px(online_badge, 14, 7, SB)
set_px(online_badge, 15, 7, SB)
set_px(online_badge, 13, 8, SB)
set_px(online_badge, 14, 8, PB)
set_px(online_badge, 15, 8, PB)
set_px(online_badge, 16, 8, SB)
set_px(online_badge, 14, 9, DP)
set_px(online_badge, 15, 9, DP)

# Signal bars (right side)
for i in range(3):
    bar_x = 22 + i * 3
    bar_h = 2 + i * 2
    bar_y = 11 - bar_h
    for dy in range(bar_h):
        set_px(online_badge, bar_x, bar_y + dy, LG)
        set_px(online_badge, bar_x+1, bar_y + dy, FG)

write_png(os.path.join(TUT_DIR, 'ui_online_indicator.png'), online_badge)

print('\n=== All tutorial expansion assets generated! ===')
print(f'Output directory: {TUT_DIR}')
