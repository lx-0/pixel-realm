#!/usr/bin/env python3
"""
Generate accessibility art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows the same palette and conventions as gen_tutorial_assets.py.

Outputs:
  assets/ui/accessibility/icon_setting_colorblind.png   : 16×16  colorblind mode icon
  assets/ui/accessibility/icon_setting_font_scale.png   : 16×16  font scale icon
  assets/ui/accessibility/icon_setting_reduced_motion.png: 16×16  reduced motion icon
  assets/ui/accessibility/icon_setting_keyboard.png     : 16×16  keyboard nav icon
  assets/ui/accessibility/icon_setting_a11y.png         : 16×16  accessibility tab icon
  assets/ui/accessibility/ui_indicator_shapes.png        : 64×16  4 shape markers (16px each)
  assets/ui/accessibility/ui_focus_ring.png              : 64×16  4-frame focus ring animation
  assets/ui/accessibility/ui_healthbar_borders.png       : 64×8   4 health bar border styles
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
A11Y_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'accessibility')
os.makedirs(A11Y_DIR, exist_ok=True)

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

# Semi-transparent
HG  = (255, 224, 64,  128)  # half-alpha gold
HW  = (240, 240, 240, 100)  # half-alpha white
LW  = (240, 240, 240, 60)   # low-alpha white

# Focus ring colors
FB  = (80,  168, 232, 180)  # semi-transparent player blue
FL  = (144, 208, 248, 120)  # semi-transparent ice highlight
FG2 = (255, 224, 64,  160)  # semi-transparent gold

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
    return [[fill]*w for __ in range(h)]

def hstack(frames):
    if not frames:
        return []
    h = len(frames[0])
    result = []
    for r in range(h):
        row = []
        for fr in frames:
            row.extend(fr[r])
        result.append(row)
    return result

# ─── Shape Indicators (16×16 each, 4 shapes = 64×16 spritesheet) ────────────
# Circle = friendly/ally (PB blue), Diamond = enemy (BR red),
# Triangle = neutral/NPC (GD gold), Square = interactive/object (LG green)

def gen_circle():
    """Circle indicator — friendly/ally. Uses blue palette."""
    s = blank(16, 16)
    # Outer ring
    for x, y in [(6,2),(7,2),(8,2),(9,2),
                  (4,3),(5,3),(10,3),(11,3),
                  (3,4),(3,5),(12,4),(12,5),
                  (2,6),(2,7),(2,8),(2,9),
                  (13,6),(13,7),(13,8),(13,9),
                  (3,10),(3,11),(12,10),(12,11),
                  (4,12),(5,12),(10,12),(11,12),
                  (6,13),(7,13),(8,13),(9,13)]:
        s[y][x] = PB
    # Fill
    for y in range(4, 12):
        x0 = 4 if y in (4,5,10,11) else (5 if y in (3,12) else 3)
        x1 = 12 if y in (4,5,10,11) else (11 if y in (3,12) else 13)
        for x in range(max(4, x0), min(12, x1)):
            if s[y][x] == _:
                s[y][x] = DP
    # Highlight
    for x, y in [(6,4),(7,4),(8,4),(5,5),(6,5)]:
        s[y][x] = HB
    return s

def gen_diamond():
    """Diamond indicator — enemy. Uses red palette."""
    s = blank(16, 16)
    # Diamond outline + fill
    rows = {
        1: (7,8),   2: (6,9),   3: (5,10),  4: (4,11),
        5: (3,12),  6: (2,13),  7: (1,14),
        8: (1,14),  9: (2,13),  10: (3,12), 11: (4,11),
        12: (5,10), 13: (6,9),  14: (7,8),
    }
    for y, (x0, x1) in rows.items():
        s[y][x0] = BR
        s[y][x1-1] = BR
        for x in range(x0+1, x1-1):
            s[y][x] = ER
    # Highlight (top)
    for x, y in [(7,3),(7,4),(8,4),(6,5),(7,5)]:
        if 0 <= y < 16 and 0 <= x < 16:
            s[y][x] = FR
    return s

def gen_triangle():
    """Triangle indicator — neutral/NPC. Uses gold palette."""
    s = blank(16, 16)
    # Upward-pointing triangle
    rows = {
        2:  (7, 9),
        3:  (6, 10),
        4:  (6, 10),
        5:  (5, 11),
        6:  (5, 11),
        7:  (4, 12),
        8:  (4, 12),
        9:  (3, 13),
        10: (3, 13),
        11: (2, 14),
        12: (2, 14),
        13: (1, 15),
    }
    for y, (x0, x1) in rows.items():
        s[y][x0] = GD
        s[y][x1-1] = GD
        for x in range(x0+1, x1-1):
            s[y][x] = DG
    # Base line
    for x in range(1, 15):
        s[13][x] = GD
    # Highlight
    for x, y in [(7,4),(8,4),(7,5),(6,6),(7,6)]:
        s[y][x] = YL
    return s

def gen_square():
    """Square indicator — interactive object. Uses green palette."""
    s = blank(16, 16)
    # Outer border
    for x in range(3, 13):
        s[3][x] = LG
        s[12][x] = LG
    for y in range(3, 13):
        s[y][3] = LG
        s[y][12] = LG
    # Fill
    for y in range(4, 12):
        for x in range(4, 12):
            s[y][x] = FG
    # Highlight (top-left)
    for x, y in [(4,4),(5,4),(6,4),(4,5),(5,5),(4,6)]:
        s[y][x] = BG
    return s

# ─── Focus Ring (16×16 each, 4 animation frames = 64×16) ────────────────────
# Pulsing focus ring for keyboard navigation

def gen_focus_frame(phase):
    """Generate one focus ring frame. Phase 0-3 controls glow intensity."""
    s = blank(16, 16)
    # Base colors cycle through blue intensities
    ring_colors = [
        (PB, DP, FB),   # phase 0: normal
        (HB, PB, FB),   # phase 1: bright
        (IW, HB, FL),   # phase 2: brightest
        (HB, PB, FB),   # phase 3: dimming
    ]
    outer, inner, glow = ring_colors[phase]

    # Outer ring
    for x in range(3, 13):
        s[2][x] = outer
        s[13][x] = outer
    for y in range(3, 13):
        s[y][2] = outer
        s[y][13] = outer
    # Corners
    s[3][3] = outer; s[3][12] = outer
    s[12][3] = outer; s[12][12] = outer

    # Inner ring (slightly inset)
    for x in range(4, 12):
        s[3][x] = inner
        s[12][x] = inner
    for y in range(4, 12):
        s[y][3] = inner
        s[y][12] = inner

    # Corner glow
    for x, y in [(2,2),(13,2),(2,13),(13,13),
                  (1,3),(1,12),(14,3),(14,12),
                  (3,1),(12,1),(3,14),(12,14)]:
        if 0 <= x < 16 and 0 <= y < 16:
            s[y][x] = glow

    return s

# ─── Health Bar Border Styles (16×8 each, 4 styles = 64×8) ──────────────────
# Different border patterns for colorblind differentiation:
# 1. Solid (friendly) — smooth blue border
# 2. Dashed (enemy) — dashed red border
# 3. Dotted (neutral) — dotted gold border
# 4. Double (boss) — double-line purple border

def gen_healthbar_solid():
    """Solid border — friendly. Blue."""
    s = blank(16, 8)
    for x in range(1, 15):
        s[0][x] = PB; s[7][x] = PB
    for y in range(1, 7):
        s[y][0] = PB; s[y][15] = PB
    s[0][0] = PB; s[0][15] = PB; s[7][0] = PB; s[7][15] = PB
    # Fill placeholder
    for y in range(1, 7):
        for x in range(1, 15):
            s[y][x] = DP
    return s

def gen_healthbar_dashed():
    """Dashed border — enemy. Red."""
    s = blank(16, 8)
    # Top/bottom: dash pattern (2 on, 1 off)
    for x in range(0, 16):
        if x % 3 != 2:
            s[0][x] = BR; s[7][x] = BR
    # Left/right: dash pattern
    for y in range(0, 8):
        if y % 3 != 2:
            s[y][0] = BR; s[y][15] = BR
    for y in range(1, 7):
        for x in range(1, 15):
            s[y][x] = DB
    return s

def gen_healthbar_dotted():
    """Dotted border — neutral. Gold."""
    s = blank(16, 8)
    for x in range(0, 16, 2):
        s[0][x] = GD; s[7][x] = GD
    for y in range(0, 8, 2):
        s[y][0] = GD; s[y][15] = GD
    for y in range(1, 7):
        for x in range(1, 15):
            s[y][x] = DG
    return s

def gen_healthbar_double():
    """Double border — boss. Purple."""
    s = blank(16, 8)
    # Outer border
    for x in range(0, 16):
        s[0][x] = MV; s[7][x] = MV
    for y in range(0, 8):
        s[y][0] = MV; s[y][15] = MV
    # Inner border (inset by 2)
    for x in range(2, 14):
        s[2][x] = MP; s[5][x] = MP
    for y in range(2, 6):
        s[y][2] = MP; s[y][13] = MP
    # Fill between borders
    for y in range(1, 7):
        for x in range(1, 15):
            if s[y][x] == _:
                s[y][x] = PM
    return s

# ─── Settings icon PNGs (pixel-art rendered from SVG designs) ────────────────

def gen_icon_colorblind():
    """Colorblind settings icon — eye with tri-color iris."""
    s = blank(16, 16)
    # Eye outline (top lid)
    for x in range(5, 11): s[3][x] = K
    s[4][4] = K; s[4][11] = K
    s[5][3] = K; s[5][12] = K
    s[6][2] = K; s[7][2] = K; s[6][13] = K; s[7][13] = K
    # Eye outline (bottom lid)
    s[8][3] = K; s[8][12] = K
    s[9][4] = K; s[9][11] = K
    for x in range(5, 11): s[10][x] = K
    # Sclera
    for x in range(5, 11): s[4][x] = NW
    for x in range(4, 12): s[5][x] = NW
    for x in range(3, 6): s[6][x] = NW; s[7][x] = NW
    for x in range(10, 13): s[6][x] = NW; s[7][x] = NW
    for x in range(4, 6): s[8][x] = NW
    for x in range(10, 12): s[8][x] = NW
    s[9][5] = NW; s[9][10] = NW
    # Iris — tri-color
    s[5][7] = BR; s[5][8] = BR  # red top
    s[6][6] = BR; s[7][6] = BR  # red left
    s[8][7] = FG; s[8][8] = FG  # green bottom
    s[6][9] = FG; s[7][9] = FG  # green right
    s[6][7] = PB; s[6][8] = PB  # blue center
    # Pupil
    s[7][7] = K; s[7][8] = K
    # Diagonal strike (filter indicator)
    s[11][2] = BR; s[10][3] = BR
    s[3][12] = BR; s[2][13] = BR
    return s

def gen_icon_font_scale():
    """Font scale icon — big A + small A with scale arrows."""
    s = blank(16, 16)
    # Large A
    s[3][3] = PB; s[3][4] = PB
    s[4][2] = PB; s[4][5] = PB
    for y in range(5, 11): s[y][1] = PB; s[y][6] = PB
    for x in range(2, 6): s[8][x] = GD  # crossbar gold
    # Small A
    s[6][10] = PB; s[6][11] = PB
    s[7][9] = PB; s[7][12] = PB
    for y in range(8, 11): s[y][9] = PB; s[y][12] = PB
    s[9][10] = GD; s[9][11] = GD  # crossbar gold
    # Scale arrows
    s[3][7] = MG
    for x in range(6, 9): s[4][x] = MG
    for y in range(5, 10): s[y][7] = MG
    for x in range(6, 9): s[10][x] = MG
    s[11][7] = MG
    return s

def gen_icon_reduced_motion():
    """Reduced motion icon — motion arcs with cancel slash."""
    s = blank(16, 16)
    # Center dot
    s[7][2] = PB; s[7][3] = PB; s[8][2] = PB; s[8][3] = PB
    # Inner arc
    for y in range(6, 10): s[y][4] = PB
    s[5][5] = PB; s[10][5] = PB
    # Middle arc
    for y in range(4, 12): s[y][7] = PB
    s[3][8] = PB; s[12][8] = PB
    # Outer arc
    for y in range(5, 11): s[y][10] = PB
    s[4][11] = PB; s[11][11] = PB
    # Cancel slash
    for i in range(13):
        x = 1 + i; y = 13 - i
        if 0 <= x < 16 and 0 <= y < 16:
            s[y][x] = BR
    return s

def gen_icon_keyboard():
    """Keyboard nav icon — keyboard with focus highlight."""
    s = blank(16, 16)
    # Body
    for x in range(1, 15):
        for y in range(4, 12):
            s[y][x] = DK
    # Border
    for x in range(1, 15): s[4][x] = K; s[11][x] = K
    for y in range(4, 12): s[y][1] = K; s[y][14] = K
    # Top row keys
    for x in (2,3): s[5][x] = MG
    for x in (5,6): s[5][x] = MG
    for x in (8,9): s[5][x] = MG
    for x in (11,12): s[5][x] = MG
    # Middle row keys
    for x in (3,4): s[7][x] = MG
    for x in (6,7): s[7][x] = MG
    for x in (9,10): s[7][x] = MG
    # Space bar
    for x in range(4, 12): s[9][x] = MG
    # Focus highlight on tab key
    s[5][2] = PB; s[5][3] = PB
    # Arrow keys (gold)
    s[8][12] = GD
    s[9][11] = GD; s[9][12] = GD; s[9][13] = GD
    return s

def gen_icon_a11y():
    """Accessibility tab icon — person in circle."""
    s = blank(16, 16)
    # Circle
    for x in range(5, 11): s[1][x] = PB; s[14][x] = PB
    for x in (3,4,11,12): s[2][x] = PB
    for x in (3,4,11,12): s[13][x] = PB
    for y in range(3, 5): s[y][2] = PB; s[y][13] = PB
    for y in range(5, 11): s[y][1] = PB; s[y][14] = PB
    for y in range(11, 13): s[y][2] = PB; s[y][13] = PB
    # Person — head
    s[3][7] = NW; s[3][8] = NW; s[4][7] = NW; s[4][8] = NW
    # Arms
    for x in range(4, 12): s[6][x] = NW
    # Torso
    for y in range(5, 9): s[y][7] = NW; s[y][8] = NW
    # Legs
    s[9][6] = NW; s[9][9] = NW
    for y in range(10, 12):
        s[y][5] = NW; s[y][6] = NW
        s[y][9] = NW; s[y][10] = NW
    return s

# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print('Generating accessibility assets...')

    # Settings icons
    write_png(os.path.join(A11Y_DIR, 'icon_setting_colorblind.png'), gen_icon_colorblind())
    write_png(os.path.join(A11Y_DIR, 'icon_setting_font_scale.png'), gen_icon_font_scale())
    write_png(os.path.join(A11Y_DIR, 'icon_setting_reduced_motion.png'), gen_icon_reduced_motion())
    write_png(os.path.join(A11Y_DIR, 'icon_setting_keyboard.png'), gen_icon_keyboard())
    write_png(os.path.join(A11Y_DIR, 'icon_setting_a11y.png'), gen_icon_a11y())

    # Shape indicators spritesheet (circle, diamond, triangle, square)
    shapes = hstack([gen_circle(), gen_diamond(), gen_triangle(), gen_square()])
    write_png(os.path.join(A11Y_DIR, 'ui_indicator_shapes.png'), shapes)

    # Focus ring animation (4 frames)
    focus_frames = hstack([gen_focus_frame(i) for i in range(4)])
    write_png(os.path.join(A11Y_DIR, 'ui_focus_ring.png'), focus_frames)

    # Health bar border styles (solid, dashed, dotted, double)
    bars = hstack([gen_healthbar_solid(), gen_healthbar_dashed(),
                   gen_healthbar_dotted(), gen_healthbar_double()])
    write_png(os.path.join(A11Y_DIR, 'ui_healthbar_borders.png'), bars)

    print('\nDone! All accessibility assets generated.')

if __name__ == '__main__':
    main()
