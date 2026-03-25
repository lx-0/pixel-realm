#!/usr/bin/env python3
"""
Generate tutorial and onboarding art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}_{size}.{ext}

Outputs:
  assets/sprites/characters/char_npc_guide.png   : 192×32  (6 frames × 32px) idle(2) + talk(4)
  assets/ui/tutorial/ui_tutorial_bubble.png       : 48×24   9-slice speech bubble frame
  assets/ui/tutorial/ui_tutorial_arrow.png        : 64×16   4 direction arrows (up/down/left/right × 16px)
  assets/ui/tutorial/ui_tutorial_arrow_pulse.png  : 192×16  4 dirs × 3 pulse frames
  assets/ui/tutorial/ui_tutorial_highlight.png    : 64×16   4-frame pulsing glow overlay (16×16 each)
  assets/ui/tutorial/icon_key_w.png               : 16×16   W key prompt
  assets/ui/tutorial/icon_key_a.png               : 16×16   A key prompt
  assets/ui/tutorial/icon_key_s.png               : 16×16   S key prompt
  assets/ui/tutorial/icon_key_d.png               : 16×16   D key prompt
  assets/ui/tutorial/icon_key_space.png           : 24×16   Spacebar prompt
  assets/ui/tutorial/icon_key_e.png               : 16×16   E key prompt
  assets/ui/tutorial/icon_key_q.png               : 16×16   Q key prompt
  assets/ui/tutorial/icon_key_shift.png           : 24×16   Shift key prompt
  assets/ui/tutorial/icon_key_m.png               : 16×16   M key prompt
  assets/ui/tutorial/icon_mouse_click.png         : 16×16   Mouse left-click icon
  assets/ui/tutorial/ui_tutorial_progress.png     : 48×8    3 dot states (inactive/active/done × 16px)
  assets/ui/tutorial/ui_tutorial_skip.png         : 48×14   Skip Tutorial button
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
CHAR_DIR = os.path.join(PROJ_DIR, 'assets', 'sprites', 'characters')
TUT_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'tutorial')
os.makedirs(CHAR_DIR, exist_ok=True)
os.makedirs(TUT_DIR, exist_ok=True)

# ─── Palette (RGBA tuples) — from ART-STYLE-GUIDE.md ────────────────────────

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

# Semi-transparent helpers for overlays
HG  = (255, 224, 64,  128)  # half-alpha gold highlight
HW  = (240, 240, 240, 100)  # half-alpha white glow
LW  = (240, 240, 240, 60)   # low-alpha white glow

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

def copy_sprite(src):
    return [row[:] for row in src]

def mirror_h(src):
    return [row[::-1] for row in src]

def hstack(frames):
    """Horizontally concatenate list of pixel grids (same height)."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result

def vstack(grids):
    result = []
    for grid in grids:
        result.extend(grid)
    return result

def overlay(dst, src, x_off, y_off):
    """Paste src onto dst at (x_off, y_off). Non-transparent pixels overwrite."""
    for r, row in enumerate(src):
        dr = r + y_off
        if dr < 0 or dr >= len(dst): continue
        for c, px in enumerate(row):
            dc = c + x_off
            if dc < 0 or dc >= len(dst[dr]): continue
            if px[3] > 0:
                dst[dr][dc] = px
    return dst

def set_px(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color

# ─── 1. TUTORIAL GUIDE NPC (32×32) ──────────────────────────────────────────
# Friendly mentor wizard: purple robes, pointed hat, staff with star
# Color language: purple = magic/mystical (friendly guide, not enemy)
# Rounded silhouette = friendly (per style guide accessibility notes)

print('\n=== Tutorial Guide NPC ===')

# --- Base frame: front-facing wizard guide ---
GUIDE_BASE = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  YL, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0  star tip
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  YL, GD, YL, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1  star
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 2  staff top
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 3  staff + hat tip
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  MP, MP, MP, MP, MP, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 4  hat
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  K,  MP, MP, MV, MV, MV, MP, MP, K,  _,  _,  _,  _,  _,  _,  _],  # 5  hat body
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, K,  PM, MP, MV, MV, SG, MV, MV, MP, PM, K,  _,  _,  _,  _,  _,  _],  # 6  hat brim
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 7  hat brim edge
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 8  forehead
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  PG, NW, PG, NW, PG, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 9  brow highlights
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  PG, K,  PG, K,  PG, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 10 eyes
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  PG, PG, PG, PG, PG, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 11 nose/cheeks
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  LS, PG, LS, PG, LS, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 12 beard top
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  _,  K,  LS, NW, LS, K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13 beard
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  _,  K,  MP, MP, MP, MP, MP, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 14 collar
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  DG, _,  K,  MP, MV, MP, GD, MP, MV, MP, K,  _,  _,  _,  _,  _,  _,  _],  # 15 shoulders + clasp
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  DG, K,  MP, MV, MV, MP, MP, MP, MV, MV, MP, K,  _,  _,  _,  _,  _,  _],  # 16 upper robe (hand on staff)
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, K,  MP, MV, MV, MP, MP, MP, MV, MV, MP, K,  _,  _,  _,  _,  _,  _],  # 17 torso
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, K,  MP, MP, MV, MV, MP, MV, MV, MP, MP, K,  _,  _,  _,  _,  _,  _],  # 18 torso
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  K,  MP, MP, MV, MV, MV, MP, MP, K,  _,  _,  _,  _,  _,  _,  _],  # 19 waist
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  K,  MP, MP, MV, GD, MV, MP, MP, K,  _,  _,  _,  _,  _,  _,  _],  # 20 belt w/ gem
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  K,  MP, MV, MV, MV, MV, MV, MP, K,  _,  _,  _,  _,  _,  _,  _],  # 21 lower robe
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  K,  MP, MV, MV, MV, MV, MV, MP, K,  _,  _,  _,  _,  _,  _,  _],  # 22 robe
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  K,  PM, MP, MV, MV, MV, MP, PM, K,  _,  _,  _,  _,  _,  _,  _],  # 23 robe shadow
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  K,  PM, MP, MP, MP, MP, MP, PM, K,  _,  _,  _,  _,  _,  _,  _],  # 24 robe bottom
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  _,  K,  PM, MP, MP, MP, PM, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 25 robe hem
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  BN, _,  _,  K,  PM, PM, PM, PM, PM, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 26 robe edge
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  _,  _,  _,  K,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 27 robe bottom
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  DT, DT, K,  DT, DT, K,  _,  _,  _,  _,  _,  _,  _,  _],  # 28 feet
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  K,  _,  K,  K,  K,  _,  _,  _,  _,  _,  _,  _,  _],  # 29 shoe soles
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 30
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 31
]

# Idle frame 1: slight sway (star glows brighter, robe shifts 1px)
GUIDE_IDLE1 = copy_sprite(GUIDE_BASE)
# Star pulses brighter
set_px(GUIDE_IDLE1, 14, 0, PY)
set_px(GUIDE_IDLE1, 13, 1, PY)
set_px(GUIDE_IDLE1, 14, 1, YL)
set_px(GUIDE_IDLE1, 15, 1, PY)

# Talk frame 0: mouth open (small "o")
GUIDE_TALK0 = copy_sprite(GUIDE_BASE)
# Open mouth in beard area
set_px(GUIDE_TALK0, 20, 11, K)   # mouth open

# Talk frame 1: mouth wide + hand raised gesture (arm extends right)
GUIDE_TALK1 = copy_sprite(GUIDE_BASE)
set_px(GUIDE_TALK1, 20, 11, K)   # mouth open
set_px(GUIDE_TALK1, 19, 11, K)   # mouth wider
# Raise right hand (extend robe arm right)
set_px(GUIDE_TALK1, 25, 15, PG)
set_px(GUIDE_TALK1, 26, 15, PG)
set_px(GUIDE_TALK1, 25, 16, K)
set_px(GUIDE_TALK1, 26, 16, K)

# Talk frame 2: mouth closing, star bright
GUIDE_TALK2 = copy_sprite(GUIDE_BASE)
set_px(GUIDE_TALK2, 20, 11, MG)  # mouth partially open
set_px(GUIDE_TALK2, 14, 0, PY)   # star pulse
set_px(GUIDE_TALK2, 25, 15, PG)  # hand still up
set_px(GUIDE_TALK2, 26, 15, K)

# Talk frame 3: back to base (closing mouth, hand down)
GUIDE_TALK3 = copy_sprite(GUIDE_BASE)
set_px(GUIDE_TALK3, 14, 0, PY)
set_px(GUIDE_TALK3, 13, 1, PY)
set_px(GUIDE_TALK3, 15, 1, PY)

# Assemble: idle(2 frames) + talk(4 frames) = 6 frames × 32px = 192×32
guide_sheet = hstack([GUIDE_BASE, GUIDE_IDLE1, GUIDE_TALK0, GUIDE_TALK1, GUIDE_TALK2, GUIDE_TALK3])
write_png(os.path.join(CHAR_DIR, 'char_npc_guide.png'), guide_sheet)

# ─── 2. TUTORIAL PROMPT BUBBLE ──────────────────────────────────────────────
# 9-slice speech bubble frame: 48×24
# Outer border = dark outline, inner fill = semi-transparent dark blue
# Small tail at bottom-left pointing down

print('\n=== Tutorial Prompt Bubble ===')

# Colors for bubble
BB  = (10,  26,  58,  220)   # bubble fill (deep ocean, slightly transparent)
BO  = (42,  122, 192, 255)   # bubble outline (sky blue)
BH  = (144, 208, 248, 255)   # bubble highlight (ice blue)

def make_bubble(w, h):
    """Create a speech bubble frame with rounded corners and tail."""
    grid = blank(w, h)
    # Fill interior
    for y in range(2, h - 4):
        for x in range(2, w - 2):
            set_px(grid, x, y, BB)
    # Top/bottom edges
    for x in range(2, w - 2):
        set_px(grid, x, 1, BO)
        set_px(grid, x, h - 5, BO)
    # Left/right edges
    for y in range(2, h - 4):
        set_px(grid, 1, y, BO)
        set_px(grid, w - 2, y, BO)
    # Corners
    set_px(grid, 2, 1, BO); set_px(grid, 1, 2, BO)
    set_px(grid, w-3, 1, BO); set_px(grid, w-2, 2, BO)
    set_px(grid, 1, h-5, BO); set_px(grid, 2, h-5, BO)
    set_px(grid, w-2, h-5, BO); set_px(grid, w-3, h-5, BO)
    # Highlight top edge (inner)
    for x in range(3, w - 3):
        set_px(grid, x, 2, BH)
    # Tail (bottom-center, pointing down)
    mid = w // 2
    for i in range(3):
        set_px(grid, mid - 1 + i, h - 4, BO)
    set_px(grid, mid - 1, h - 3, BO)
    set_px(grid, mid, h - 3, BB)
    set_px(grid, mid + 1, h - 3, BO)
    set_px(grid, mid, h - 2, BO)
    return grid

bubble = make_bubble(48, 24)
write_png(os.path.join(TUT_DIR, 'ui_tutorial_bubble.png'), bubble)

# ─── 3. DIRECTIONAL ARROW INDICATORS ────────────────────────────────────────
# 4 directions (up, down, left, right) × 16×16 each
# 3 pulse frames per direction (normal, bright, brightest) = 12 frames total
# Static sheet: 64×16 (4 dirs, 1 frame each)
# Pulse sheet:  192×16 (4 dirs × 3 frames = 12 frames)

print('\n=== Directional Arrows ===')

# Arrow pointing up (16×16) — yellow (quest/objective color)
ARROW_UP = [
    #0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [ _, _,  _,  _,  _,  _,  _,  K,  K,  _,  _,  _,  _,  _,  _,  _],  # 1
    [ _, _,  _,  _,  _,  _,  K,  YL, YL, K,  _,  _,  _,  _,  _,  _],  # 2
    [ _, _,  _,  _,  _,  K,  YL, YL, YL, YL, K,  _,  _,  _,  _,  _],  # 3
    [ _, _,  _,  _,  K,  YL, YL, PY, PY, YL, YL, K,  _,  _,  _,  _],  # 4
    [ _, _,  _,  K,  GD, YL, YL, PY, PY, YL, YL, GD, K,  _,  _,  _],  # 5
    [ _, _,  K,  GD, GD, YL, YL, PY, PY, YL, YL, GD, GD, K,  _,  _],  # 6
    [ _, K,  DG, GD, GD, GD, YL, YL, YL, YL, GD, GD, GD, DG, K,  _],  # 7
    [ _, _,  K,  K,  K,  K,  YL, YL, YL, YL, K,  K,  K,  K,  _,  _],  # 8
    [ _, _,  _,  _,  _,  K,  YL, YL, YL, YL, K,  _,  _,  _,  _,  _],  # 9
    [ _, _,  _,  _,  _,  K,  GD, YL, YL, GD, K,  _,  _,  _,  _,  _],  # 10
    [ _, _,  _,  _,  _,  K,  GD, GD, GD, GD, K,  _,  _,  _,  _,  _],  # 11
    [ _, _,  _,  _,  _,  K,  DG, GD, GD, DG, K,  _,  _,  _,  _,  _],  # 12
    [ _, _,  _,  _,  _,  _,  K,  K,  K,  K,  _,  _,  _,  _,  _,  _],  # 13
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [ _, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]

def rotate_90_cw(grid):
    """Rotate a pixel grid 90 degrees clockwise."""
    h = len(grid)
    w = len(grid[0])
    return [[grid[h - 1 - c][r] for c in range(h)] for r in range(w)]

def rotate_180(grid):
    return [row[::-1] for row in grid[::-1]]

# Generate all 4 directions from the up arrow
ARROW_DOWN  = rotate_180(ARROW_UP)
ARROW_RIGHT = rotate_90_cw(ARROW_UP)
ARROW_LEFT  = mirror_h(ARROW_RIGHT)

# Static sheet: up, down, left, right
arrows_static = hstack([ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT])
write_png(os.path.join(TUT_DIR, 'ui_tutorial_arrow.png'), arrows_static)

# Pulse variants: brighten the arrow for animation
def brighten_arrow(arrow, level):
    """level 0=normal, 1=bright, 2=brightest"""
    result = copy_sprite(arrow)
    for y in range(len(result)):
        for x in range(len(result[0])):
            r, g, b, a = result[y][x]
            if a == 0: continue
            if level == 1:
                # Shift toward PY (pale highlight)
                r = min(255, r + 20)
                g = min(255, g + 20)
                b = min(255, b + 20)
            elif level == 2:
                r = min(255, r + 40)
                g = min(255, g + 40)
                b = min(255, b + 40)
            result[y][x] = (r, g, b, a)
    return result

pulse_frames = []
for arrow in [ARROW_UP, ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT]:
    for lvl in range(3):
        pulse_frames.append(brighten_arrow(arrow, lvl))

arrows_pulse = hstack(pulse_frames)
write_png(os.path.join(TUT_DIR, 'ui_tutorial_arrow_pulse.png'), arrows_pulse)

# ─── 4. HIGHLIGHT/GLOW OVERLAY ──────────────────────────────────────────────
# 4-frame pulsing glow border (16×16 each) = 64×16
# Semi-transparent yellow/gold glow that pulses in opacity

print('\n=== Highlight/Glow Overlay ===')

def make_glow_frame(size, alpha_level):
    """Create a glow border frame at given alpha."""
    base_a = [60, 100, 140, 180][alpha_level]
    inner_a = base_a // 2
    grid = blank(size, size)
    # Outer glow border (2px thick)
    for x in range(size):
        set_px(grid, x, 0, (255, 224, 64, base_a))
        set_px(grid, x, 1, (255, 224, 64, inner_a))
        set_px(grid, x, size-1, (255, 224, 64, base_a))
        set_px(grid, x, size-2, (255, 224, 64, inner_a))
    for y in range(size):
        set_px(grid, 0, y, (255, 224, 64, base_a))
        set_px(grid, 1, y, (255, 224, 64, inner_a))
        set_px(grid, size-1, y, (255, 224, 64, base_a))
        set_px(grid, size-2, y, (255, 224, 64, inner_a))
    # Corner emphasis
    for dx, dy in [(0,0), (size-1,0), (0,size-1), (size-1,size-1)]:
        set_px(grid, dx, dy, (255, 248, 160, min(255, base_a + 40)))
    return grid

glow_frames = [make_glow_frame(16, i) for i in range(4)]
glow_sheet = hstack(glow_frames)
write_png(os.path.join(TUT_DIR, 'ui_tutorial_highlight.png'), glow_sheet)

# ─── 5. KEY PROMPT ICONS (16×16 each) ───────────────────────────────────────
# Pixel art keyboard key icons: raised 3D-ish key cap look
# Dark border, stone gray face, letter in dark color

print('\n=== Key Prompt Icons ===')

# Key cap template: 3D raised look
# Top face is lighter, sides are darker = looks like a physical key
def make_key_icon(w, h, letter_pixels):
    """
    Create a key-cap icon.
    w, h: icon dimensions
    letter_pixels: list of (x, y) coords for the letter shape (relative to key face)
    """
    grid = blank(w, h)
    # Key shadow (bottom-right)
    for x in range(2, w - 1):
        set_px(grid, x, h - 2, DK)
    for y in range(2, h - 1):
        set_px(grid, w - 2, y, DK)
    # Key outline
    for x in range(1, w - 1):
        set_px(grid, x, 1, K)
        set_px(grid, x, h - 3, K)
    for y in range(2, h - 3):
        set_px(grid, 1, y, K)
        set_px(grid, w - 2, y, K)
    # Key face fill
    for y in range(2, h - 3):
        for x in range(2, w - 2):
            set_px(grid, x, y, ST)
    # Top highlight
    for x in range(2, w - 2):
        set_px(grid, x, 2, MG)
    # Left highlight
    for y in range(2, h - 3):
        set_px(grid, 2, y, MG)
    # Letter (dark, centered on face)
    ox = (w - 2) // 2 - 2  # offset to center roughly
    oy = (h - 3) // 2 - 1
    for lx, ly in letter_pixels:
        set_px(grid, ox + lx, oy + ly, NW)
    return grid

# Letter pixel definitions (5×5 grid for each letter, relative coords)
LETTERS = {
    'W': [(0,0),(0,1),(0,2),(0,3),(0,4), (1,3),(1,4), (2,2),(2,3), (3,3),(3,4), (4,0),(4,1),(4,2),(4,3),(4,4)],
    'A': [(0,1),(0,2),(0,3),(0,4), (1,0),(1,2), (2,0),(2,2), (3,0),(3,2), (4,1),(4,2),(4,3),(4,4)],
    'S': [(0,1),(0,4), (1,0),(1,4), (2,0),(2,2), (3,0),(3,2), (4,0),(4,3)],
    'D': [(0,0),(0,1),(0,2),(0,3),(0,4), (1,0),(1,4), (2,0),(2,4), (3,0),(3,4), (4,1),(4,2),(4,3)],
    'E': [(0,0),(0,1),(0,2),(0,3),(0,4), (1,0),(1,2),(1,4), (2,0),(2,2),(2,4), (3,0),(3,4)],
    'Q': [(0,1),(0,2),(0,3), (1,0),(1,4), (2,0),(2,4), (3,0),(3,3), (4,1),(4,2),(4,4)],
    'M': [(0,0),(0,1),(0,2),(0,3),(0,4), (1,1), (2,2), (3,1), (4,0),(4,1),(4,2),(4,3),(4,4)],
    'T': [(0,0), (1,0), (2,0),(2,1),(2,2),(2,3),(2,4), (3,0), (4,0)],
}

# Generate standard 16×16 key icons
for letter in ['W', 'A', 'S', 'D', 'E', 'Q', 'M']:
    icon = make_key_icon(16, 16, LETTERS[letter])
    write_png(os.path.join(TUT_DIR, f'icon_key_{letter.lower()}.png'), icon)

# Spacebar (wider: 24×16)
def make_spacebar():
    grid = make_key_icon(24, 16, [])
    # Draw "SPC" text or just a horizontal line to indicate spacebar
    # Simple: draw a line in the middle
    for x in range(6, 18):
        set_px(grid, x, 8, NW)
    return grid

write_png(os.path.join(TUT_DIR, 'icon_key_space.png'), make_spacebar())

# Shift key (wider: 24×16)
def make_shift_key():
    grid = make_key_icon(24, 16, [])
    # Draw up-arrow to represent Shift
    mid = 12
    for dy in range(5):
        for dx in range(-dy, dy + 1):
            set_px(grid, mid + dx, 4 + dy, NW)
    # Stem
    for y in range(9, 12):
        set_px(grid, mid - 1, y, NW)
        set_px(grid, mid, y, NW)
        set_px(grid, mid + 1, y, NW)
    return grid

write_png(os.path.join(TUT_DIR, 'icon_key_shift.png'), make_shift_key())

# Mouse left-click icon (16×16)
def make_mouse_icon():
    grid = blank(16, 16)
    # Mouse body outline
    # Top (rounded)
    for x in range(5, 11):
        set_px(grid, x, 1, K)
    for x in range(4, 12):
        set_px(grid, x, 2, K)
    # Left/right sides
    for y in range(3, 13):
        set_px(grid, 3, y, K)
        set_px(grid, 12, y, K)
    # Bottom (rounded)
    for x in range(4, 12):
        set_px(grid, x, 13, K)
    for x in range(5, 11):
        set_px(grid, x, 14, K)
    # Fill body
    for y in range(3, 13):
        for x in range(4, 12):
            set_px(grid, x, y, LS)
    for y in range(2, 3):
        for x in range(5, 11):
            set_px(grid, x, y, LS)
    # Center divider line
    for y in range(2, 8):
        set_px(grid, 7, y, K)
        set_px(grid, 8, y, K)
    # Left button highlighted (click indicator)
    for y in range(3, 7):
        for x in range(4, 7):
            set_px(grid, x, y, PB)
    # Scroll wheel
    set_px(grid, 7, 3, MG)
    set_px(grid, 8, 3, MG)
    set_px(grid, 7, 4, NW)
    set_px(grid, 8, 4, NW)
    set_px(grid, 7, 5, MG)
    set_px(grid, 8, 5, MG)
    # Click arrow indicator
    set_px(grid, 2, 4, YL)
    set_px(grid, 1, 5, YL)
    set_px(grid, 2, 5, YL)
    set_px(grid, 3, 5, YL)
    return grid

write_png(os.path.join(TUT_DIR, 'icon_mouse_click.png'), make_mouse_icon())

# ─── 6. PROGRESS INDICATOR ──────────────────────────────────────────────────
# 3 states × 16×8 each: inactive (gray), active (gold pulse), done (green check)
# Layout: 48×8 horizontal strip

print('\n=== Progress Indicator ===')

def make_progress_dots():
    grid = blank(48, 8)
    # Dot 1: Inactive (gray circle)
    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),(0,0),(-1,-1),(1,-1),(-1,1),(1,1)]:
        set_px(grid, 8 + dx, 4 + dy, ST)
    for dx, dy in [(-2,0),(2,0),(0,-2),(0,2)]:
        set_px(grid, 8 + dx, 4 + dy, MG)

    # Dot 2: Active (gold, brighter)
    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),(0,0),(-1,-1),(1,-1),(-1,1),(1,1)]:
        set_px(grid, 24 + dx, 4 + dy, YL)
    for dx, dy in [(-2,0),(2,0),(0,-2),(0,2)]:
        set_px(grid, 24 + dx, 4 + dy, GD)

    # Dot 3: Done (green with check)
    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),(0,0),(-1,-1),(1,-1),(-1,1),(1,1)]:
        set_px(grid, 40 + dx, 4 + dy, LG)
    for dx, dy in [(-2,0),(2,0),(0,-2),(0,2)]:
        set_px(grid, 40 + dx, 4 + dy, FG)
    # Check mark
    set_px(grid, 39, 4, NW)
    set_px(grid, 40, 5, NW)
    set_px(grid, 41, 3, NW)

    return grid

write_png(os.path.join(TUT_DIR, 'ui_tutorial_progress.png'), make_progress_dots())

# ─── 7. SKIP TUTORIAL BUTTON ────────────────────────────────────────────────
# 48×14 button matching existing ui_btn.png style
# Dark background, colored border, text area

print('\n=== Skip Tutorial Button ===')

def make_skip_button():
    w, h = 48, 14
    grid = blank(w, h)
    # Button shadow (bottom)
    for x in range(2, w - 1):
        set_px(grid, x, h - 1, DK)
    for y in range(2, h - 1):
        set_px(grid, w - 1, y, DK)
    # Outline
    for x in range(1, w - 1):
        set_px(grid, x, 0, K)
        set_px(grid, x, h - 2, K)
    for y in range(1, h - 2):
        set_px(grid, 0, y, K)
        set_px(grid, w - 2, y, K)
    # Fill (dark blue-gray)
    for y in range(1, h - 2):
        for x in range(1, w - 2):
            set_px(grid, x, y, DK)
    # Top highlight
    for x in range(2, w - 2):
        set_px(grid, x, 1, ST)
    # Colored accent border (inner, subtle)
    for x in range(2, w - 2):
        set_px(grid, x, 2, (74, 74, 74, 180))

    # "SKIP" text in pixel font (simple 3×5 letters)
    # S K I P centered
    # Each letter 3px wide + 1px gap = 4px per char, "SKIP" = 15px wide
    # Center in 48px: start at x = (48 - 15) // 2 = 16
    sx = 14
    sy = 5

    # S
    pixels_s = [(0,0),(1,0),(2,0), (0,1), (0,2),(1,2),(2,2), (2,3), (0,4),(1,4),(2,4)]
    for dx, dy in pixels_s:
        set_px(grid, sx + dx, sy + dy, LS)
    # K
    sx += 4
    pixels_k = [(0,0),(0,1),(0,2),(0,3),(0,4), (2,0),(1,1),(1,2),(1,3),(2,4)]
    for dx, dy in pixels_k:
        set_px(grid, sx + dx, sy + dy, LS)
    # I
    sx += 4
    pixels_i = [(0,0),(1,0),(2,0), (1,1),(1,2),(1,3), (0,4),(1,4),(2,4)]
    for dx, dy in pixels_i:
        set_px(grid, sx + dx, sy + dy, LS)
    # P
    sx += 4
    pixels_p = [(0,0),(0,1),(0,2),(0,3),(0,4), (1,0),(2,0), (2,1), (1,2),(2,2)]
    for dx, dy in pixels_p:
        set_px(grid, sx + dx, sy + dy, LS)

    return grid

write_png(os.path.join(TUT_DIR, 'ui_tutorial_skip.png'), make_skip_button())

# ─── Summary ─────────────────────────────────────────────────────────────────

print('\n=== Tutorial Asset Generation Complete ===')
print(f'  Character dir: {CHAR_DIR}')
print(f'  Tutorial dir:  {TUT_DIR}')
print('  Assets:')
print('    char_npc_guide.png        - 192x32  (6 frames: idle×2 + talk×4)')
print('    ui_tutorial_bubble.png    - 48x24   (9-slice speech bubble)')
print('    ui_tutorial_arrow.png     - 64x16   (4 direction arrows)')
print('    ui_tutorial_arrow_pulse.png - 192x16 (4 dirs × 3 pulse frames)')
print('    ui_tutorial_highlight.png - 64x16   (4-frame glow overlay)')
print('    icon_key_[w/a/s/d/e/q/m].png - 16x16 each (key prompts)')
print('    icon_key_space.png        - 24x16   (spacebar)')
print('    icon_key_shift.png        - 24x16   (shift key)')
print('    icon_mouse_click.png      - 16x16   (mouse left-click)')
print('    ui_tutorial_progress.png  - 48x8    (3 dot states)')
print('    ui_tutorial_skip.png      - 48x14   (skip button)')
