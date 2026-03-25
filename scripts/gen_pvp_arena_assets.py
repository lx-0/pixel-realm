#!/usr/bin/env python3
"""
Generate PvP ranked arena art assets for PixelRealm (PIX-268).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/ART-STYLE-GUIDE.md — 32-color master palette, SNES-era RPG style.

Assets produced:
  Arena battle backgrounds (320×180):
    bg_arena_colosseum.png      — Stone colosseum, pillars, sand floor, torches
    bg_arena_shadow_pit.png     — Dark cavern, purple runes, void energy
    bg_arena_sky_platform.png   — Celestial floating platform, clouds, stars

  Champion rank badge (16×16):
    icon_rank_arena_champion.png — Crown/star emblem in gold+purple

  Matchmaking UI sprites:
    ui_arena_timer.png          — 48×48 queue timer frame
    ui_arena_vs_splash.png      — 160×80 VS splash graphic
    ui_arena_banner_win.png     — 120×32 victory banner
    ui_arena_banner_loss.png    — 120×32 defeat banner
    ui_arena_rating_up.png      — 16×16 rating increase arrow
    ui_arena_rating_down.png    — 16×16 rating decrease arrow

  Arena-exclusive equipment (16×24 sprite frames):
    equip_pvp_gladiator_helm.png  — 32×24 (2 frames)
    equip_pvp_arena_blade.png     — 32×24 (2 frames)
    equip_pvp_champion_cape.png   — 32×24 (2 frames)

  PvP currency icon (16×16):
    icon_currency_pvp.png

  Arena NPC — PvP Queue Master (16×24, 4 frames):
    char_npc_arena_master.png   — 64×24 spritesheet
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR   = os.path.join(SCRIPT_DIR, '..')
OUT_DIR    = os.path.join(PROJ_DIR, 'public', 'assets')
ART_BG     = os.path.join(PROJ_DIR, 'assets', 'backgrounds')
ART_ICONS  = os.path.join(PROJ_DIR, 'assets', 'ui', 'icons')
ART_ARENA  = os.path.join(PROJ_DIR, 'assets', 'ui', 'arena')
ART_CHARS  = os.path.join(PROJ_DIR, 'assets', 'sprites', 'characters')
ART_EQUIP  = os.path.join(ART_CHARS, 'equipment')

for d in [OUT_DIR, ART_BG, ART_ICONS, ART_ARENA, ART_CHARS, ART_EQUIP]:
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
    print(f'  wrote {os.path.relpath(path)}  ({width}x{height})')


# ─── Pixel helpers ───────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill] * w for _r in range(h)]


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


def dual_write(art_path, public_name, pixels):
    """Write asset to both the art directory and public/assets."""
    write_png(art_path, pixels)
    write_png(os.path.join(OUT_DIR, public_name), pixels)


# ═════════════════════════════════════════════════════════════════════════════
# 1. ARENA BATTLE BACKGROUNDS (320×180)
# ═════════════════════════════════════════════════════════════════════════════

def make_bg_colosseum():
    """Colosseum — stone arena with pillars, sand floor, torches, spectator rows."""
    p = blank(320, 180, OC)

    # Sky band
    rect(p, 0, 0, 320, 40, OC)
    rect(p, 0, 10, 320, 20, DK)
    # Stars
    for sx, sy in [(15,5),(45,12),(80,3),(120,8),(170,4),(210,14),(260,6),(300,10),
                   (35,18),(95,22),(155,16),(225,20),(285,24),(50,30),(140,35),(240,32)]:
        dot(p, sx, sy, LS)

    # Colosseum walls — tiered stone arches
    rect(p, 0, 30, 320, 50, ST)
    rect(p, 0, 32, 320, 46, MG)
    # Upper arches row
    for ax in range(10, 310, 30):
        rect(p, ax, 32, 20, 18, DK)
        rect(p, ax + 2, 34, 16, 14, K)
        hline(p, ax, 32, 20, ST)
    # Lower arches row
    for ax in range(20, 300, 30):
        rect(p, ax, 52, 20, 16, DK)
        rect(p, ax + 2, 54, 16, 12, K)
        hline(p, ax, 52, 20, ST)
    # Wall base
    rect(p, 0, 70, 320, 8, ST)
    hline(p, 0, 70, 320, K)
    hline(p, 0, 77, 320, K)

    # Spectator area — silhouettes
    for sx in range(5, 315, 8):
        rect(p, sx, 72, 4, 5, DK)
        rect(p, sx + 1, 71, 2, 1, MG)  # head highlight

    # Pillars left and right
    for px_x in [20, 280]:
        rect(p, px_x, 60, 12, 80, ST)
        rect(p, px_x, 60, 12, 4, LS)   # capital
        rect(p, px_x, 136, 12, 4, LS)  # base
        outline(p, px_x, 60, 12, 80, K)
        vline(p, px_x + 3, 64, 72, MG)  # shadow line

    # Torches on pillars
    for tx in [23, 283]:
        rect(p, tx, 80, 4, 6, DT)   # bracket
        rect(p, tx, 76, 4, 4, FR)   # flame
        rect(p, tx + 1, 75, 2, 2, YL)
        dot(p, tx + 1, 74, PY)

    # Sand floor
    rect(p, 0, 120, 320, 60, SN)
    rect(p, 0, 118, 320, 4, DS)
    hline(p, 0, 118, 320, DG)
    # Sand texture
    for sx, sy in [(10,125),(30,132),(55,128),(80,140),(110,135),(145,130),(175,142),
                   (200,126),(230,138),(260,133),(290,128),(40,148),(100,150),(160,145),
                   (220,152),(280,148),(15,155),(65,160),(130,158),(195,162),(255,156),
                   (310,145),(5,170),(50,168),(115,172),(180,170),(245,165),(305,175)]:
        dot(p, sx, sy, DS)
    for sx, sy in [(20,130),(70,145),(120,138),(170,150),(230,143),(270,155),(310,135),
                   (45,165),(135,170),(210,168)]:
        dot(p, sx, sy, DT)

    # Center emblem on floor
    rect(p, 148, 140, 24, 2, DG)
    rect(p, 152, 138, 16, 6, DG)
    rect(p, 156, 136, 8, 10, GD)
    dot(p, 159, 140, YL)
    dot(p, 160, 140, YL)

    # Bottom shadow
    rect(p, 0, 176, 320, 4, BD)

    return p


def make_bg_shadow_pit():
    """Shadow Pit — dark cavern with purple runes, glowing void cracks, magical energy."""
    p = blank(320, 180, K)

    # Dark cavern ceiling
    rect(p, 0, 0, 320, 50, K)
    # Stalactites
    for sx in range(10, 310, 25):
        for dy in range(8):
            w = max(1, 6 - dy)
            rect(p, sx + 3 - w // 2, dy * 3, w, 3, DK)
        dot(p, sx + 3, 24, MV)  # drip glow

    # Cavern walls
    rect(p, 0, 40, 320, 40, DK)
    rect(p, 0, 42, 320, 36, PM)
    # Purple rune patterns on walls
    for rx in range(20, 300, 40):
        # Vertical rune line
        vline(p, rx, 44, 30, MV)
        vline(p, rx + 10, 44, 30, MV)
        # Horizontal connectors
        hline(p, rx, 50, 10, MP)
        hline(p, rx, 64, 10, MP)
        # Glow dots
        dot(p, rx + 5, 57, SG)
    hline(p, 0, 40, 320, K)
    hline(p, 0, 78, 320, K)

    # Side columns of dark stone
    for cx in [5, 295]:
        rect(p, cx, 40, 16, 100, DK)
        outline(p, cx, 40, 16, 100, K)
        # Purple crystal insets
        rect(p, cx + 5, 55, 6, 8, MP)
        rect(p, cx + 6, 56, 4, 6, MV)
        dot(p, cx + 7, 58, SG)
        rect(p, cx + 5, 85, 6, 8, MP)
        rect(p, cx + 6, 86, 4, 6, MV)
        dot(p, cx + 7, 88, SG)

    # Dark stone floor
    rect(p, 0, 100, 320, 80, DK)
    rect(p, 0, 100, 320, 3, K)
    # Floor cracks with purple glow
    for cx, cy in [(40,115),(90,125),(140,110),(200,130),(250,120),(300,115),
                   (60,145),(130,150),(180,140),(240,155),(280,145)]:
        hline(p, cx, cy, 8, PM)
        hline(p, cx + 1, cy - 1, 6, MP)
        dot(p, cx + 3, cy - 1, MV)
    # Void energy circle in center
    for i in range(12):
        x = 160 + int(20 * (1 if i % 2 == 0 else -1) * (0.3 + (i % 4) * 0.2))
        y = 130 + int(10 * (1 if i < 6 else -1) * (0.2 + (i % 3) * 0.3))
        dot(p, x, y, MV)
    rect(p, 155, 125, 10, 10, PM)
    rect(p, 157, 127, 6, 6, MP)
    rect(p, 158, 128, 4, 4, MV)
    dot(p, 159, 129, SG)
    dot(p, 160, 130, SG)

    # Floating purple particles
    for px_x, py in [(50,30),(100,20),(170,15),(230,25),(280,10),(35,70),(130,65),
                      (200,55),(260,72),(80,90),(310,80)]:
        dot(p, px_x, py, SG)

    # Bottom void
    rect(p, 0, 170, 320, 10, K)
    for vx in range(0, 320, 4):
        dot(p, vx, 170, PM)

    return p


def make_bg_sky_platform():
    """Sky Platform — celestial floating arena above clouds with stars and golden light."""
    p = blank(320, 180, OC)

    # Deep sky gradient
    rect(p, 0, 0, 320, 30, OC)
    rect(p, 0, 30, 320, 30, DP)
    rect(p, 0, 60, 320, 30, SB)
    rect(p, 0, 90, 320, 20, PB)

    # Stars in upper sky
    for sx, sy in [(12,4),(38,8),(67,3),(95,11),(130,6),(158,2),(190,9),(218,5),
                   (245,12),(278,7),(305,3),(25,20),(72,16),(115,22),(165,18),
                   (205,24),(250,19),(290,15),(45,28),(140,26),(230,22)]:
        dot(p, sx, sy, NW)
    # Brighter stars
    for sx, sy in [(55,6),(150,10),(210,3),(285,18)]:
        dot(p, sx, sy, PY)
        dot(p, sx + 1, sy, NW)

    # Celestial glow at center top
    rect(p, 140, 5, 40, 8, GD)
    rect(p, 145, 3, 30, 12, DG)
    rect(p, 150, 5, 20, 8, GD)
    rect(p, 155, 7, 10, 4, YL)

    # Clouds
    for cx, cy, cw in [(10, 80, 50), (80, 75, 40), (180, 82, 60), (260, 78, 45),
                        (30, 95, 35), (130, 90, 50), (230, 88, 40), (300, 92, 30)]:
        rect(p, cx, cy, cw, 6, PG)
        rect(p, cx + 3, cy - 2, cw - 6, 4, NW)
        rect(p, cx + 5, cy + 4, cw - 10, 3, LS)

    # Floating platform
    rect(p, 60, 110, 200, 30, ST)
    rect(p, 65, 108, 190, 4, LS)   # top edge highlight
    rect(p, 60, 110, 200, 2, NW)   # bright top surface
    hline(p, 60, 110, 200, K)
    # Platform sides (perspective)
    rect(p, 60, 112, 4, 28, MG)
    rect(p, 256, 112, 4, 28, DK)
    hline(p, 60, 139, 200, K)
    # Platform underside glow
    rect(p, 70, 140, 180, 4, SB)
    rect(p, 80, 144, 160, 3, PB)
    rect(p, 100, 147, 120, 2, HB)

    # Platform surface decorations — golden runes
    for rx in range(90, 240, 30):
        rect(p, rx, 115, 12, 2, GD)
        rect(p, rx + 4, 113, 4, 6, DG)
        dot(p, rx + 5, 115, YL)

    # Center arena circle on platform
    rect(p, 140, 118, 40, 12, DG)
    rect(p, 143, 120, 34, 8, GD)
    rect(p, 148, 122, 24, 4, YL)
    dot(p, 159, 123, PY)
    dot(p, 160, 123, PY)

    # Support chains/pillars below platform
    for cx in [80, 160, 240]:
        vline(p, cx, 140, 30, LS)
        vline(p, cx + 1, 140, 30, ST)
        dot(p, cx, 169, HB)  # glow at bottom

    # Lower clouds
    for cx, cy, cw in [(0, 160, 60), (70, 165, 50), (150, 158, 70),
                        (240, 162, 50), (290, 168, 30)]:
        rect(p, cx, cy, cw, 8, PG)
        rect(p, cx + 3, cy - 2, cw - 6, 4, NW)

    # Bottom fade
    rect(p, 0, 174, 320, 6, DP)

    return p


# ═════════════════════════════════════════════════════════════════════════════
# 2. CHAMPION RANK BADGE (16×16)
# ═════════════════════════════════════════════════════════════════════════════

def make_rank_champion():
    """Champion badge — crown shape with star, gold+purple, the ultimate PvP rank."""
    f = blank(16, 16)
    # Shield/crown base shape
    rect(f, 3, 4, 10, 10, DG)
    rect(f, 4, 5, 8, 8, GD)
    # Crown points at top
    rect(f, 4, 2, 2, 3, GD)
    rect(f, 7, 1, 2, 4, GD)
    rect(f, 10, 2, 2, 3, GD)
    # Crown tips
    dot(f, 4, 1, YL)
    dot(f, 5, 1, YL)
    dot(f, 7, 0, PY)
    dot(f, 8, 0, PY)
    dot(f, 10, 1, YL)
    dot(f, 11, 1, YL)
    # Purple gem in center
    rect(f, 6, 6, 4, 4, MP)
    rect(f, 7, 7, 2, 2, MV)
    dot(f, 7, 7, SG)
    # Star sparkle at top
    dot(f, 7, 3, PY)
    dot(f, 8, 3, PY)
    # Gold highlights
    dot(f, 5, 5, YL)
    dot(f, 10, 5, YL)
    dot(f, 5, 10, YL)
    dot(f, 10, 10, YL)
    # Bottom point
    rect(f, 6, 12, 4, 2, DG)
    rect(f, 7, 14, 2, 1, DG)
    # Outline key edges
    outline(f, 3, 4, 10, 10, K)
    hline(f, 6, 14, 4, K)
    dot(f, 7, 15, K)
    dot(f, 8, 15, K)
    return f


# ═════════════════════════════════════════════════════════════════════════════
# 3. MATCHMAKING UI SPRITES
# ═════════════════════════════════════════════════════════════════════════════

def make_arena_timer():
    """Queue timer frame — 48×48 circular frame for countdown display."""
    f = blank(48, 48, _)
    # Outer ring
    cx, cy, r = 24, 24, 20
    for y in range(48):
        for x in range(48):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if 18 <= dist <= 22:
                f[y][x] = GD
            elif 17 <= dist < 18:
                f[y][x] = K
            elif 22 < dist <= 23:
                f[y][x] = K
    # Inner ring
    for y in range(48):
        for x in range(48):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if 14 <= dist <= 16:
                f[y][x] = DG
            elif 13 <= dist < 14:
                f[y][x] = K
    # Inner dark fill
    for y in range(48):
        for x in range(48):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if dist < 13:
                f[y][x] = PM
    # Corner sword decorations (simplified)
    for px_x, py in [(6, 6), (41, 6), (6, 41), (41, 41)]:
        dot(f, px_x, py, GD)
        dot(f, px_x, py - 1, YL) if py > 0 else None
    # Cardinal highlight dots
    dot(f, 24, 2, YL)   # top
    dot(f, 24, 45, YL)  # bottom
    dot(f, 2, 24, YL)   # left
    dot(f, 45, 24, YL)  # right
    return f


def make_vs_splash():
    """VS splash graphic — 160×80 dramatic 'VS' display for match start."""
    p = blank(160, 80, _)
    # Background burst shape
    rect(p, 20, 10, 120, 60, PM)
    rect(p, 25, 8, 110, 64, DK)
    outline(p, 20, 10, 120, 60, K)
    # Gold border frame
    outline(p, 22, 12, 116, 56, GD)
    outline(p, 24, 14, 112, 52, DG)
    # Diagonal energy lines from center
    for i in range(8):
        dot(p, 80 - i * 4, 40 - i * 2, MV)
        dot(p, 80 + i * 4, 40 - i * 2, MV)
        dot(p, 80 - i * 4, 40 + i * 2, MV)
        dot(p, 80 + i * 4, 40 + i * 2, MV)

    # "V" letter (left side)
    for i in range(12):
        rect(p, 48 + i, 22 + i, 3, 1, YL)
        rect(p, 68 - i, 22 + i, 3, 1, YL)
    # V outline
    for i in range(12):
        dot(p, 47 + i, 22 + i, K)
        dot(p, 71 - i, 22 + i, K)
    # V base point
    rect(p, 58, 33, 4, 3, PY)

    # "S" letter (right side)
    rect(p, 82, 22, 18, 3, YL)   # top bar
    rect(p, 82, 25, 4, 6, YL)    # left stem
    rect(p, 82, 31, 18, 3, YL)   # middle bar
    rect(p, 96, 34, 4, 6, YL)    # right stem
    rect(p, 82, 40, 18, 3, YL)   # bottom bar
    # S outline
    outline(p, 81, 21, 20, 23, K)

    # Glow effects
    rect(p, 55, 35, 10, 4, GD)
    rect(p, 57, 36, 6, 2, PY)

    # Lightning bolts (simple)
    for lx, ly in [(35, 30), (125, 30)]:
        dot(p, lx, ly, PY)
        dot(p, lx + 1, ly + 1, YL)
        dot(p, lx, ly + 2, PY)
        dot(p, lx + 1, ly + 3, YL)

    return p


def make_banner_win():
    """Victory banner — 120×32 gold banner with 'WIN' indication."""
    p = blank(120, 32, _)
    # Banner ribbon shape
    rect(p, 8, 4, 104, 24, DG)
    rect(p, 10, 6, 100, 20, GD)
    outline(p, 8, 4, 104, 24, K)
    # Ribbon tails
    rect(p, 0, 8, 10, 16, GD)
    rect(p, 110, 8, 10, 16, GD)
    # Angled cuts on tails
    for i in range(4):
        dot(p, i, 8 + i, _)
        dot(p, i, 23 - i, _)
        dot(p, 119 - i, 8 + i, _)
        dot(p, 119 - i, 23 - i, _)
    # Inner bright area for text
    rect(p, 30, 10, 60, 12, YL)
    rect(p, 32, 11, 56, 10, PY)
    outline(p, 30, 10, 60, 12, DG)
    # Star decorations
    for sx in [18, 100]:
        dot(p, sx, 15, PY)
        dot(p, sx - 1, 14, YL)
        dot(p, sx + 1, 14, YL)
        dot(p, sx, 13, PY)
        dot(p, sx, 16, YL)
    # "VICTORY" block pattern
    rect(p, 38, 13, 44, 6, GD)
    rect(p, 40, 14, 40, 4, YL)
    return p


def make_banner_loss():
    """Defeat banner — 120×32 red/dark banner with 'LOSS' indication."""
    p = blank(120, 32, _)
    # Banner ribbon shape
    rect(p, 8, 4, 104, 24, DB)
    rect(p, 10, 6, 100, 20, ER)
    outline(p, 8, 4, 104, 24, K)
    # Ribbon tails
    rect(p, 0, 8, 10, 16, ER)
    rect(p, 110, 8, 10, 16, ER)
    for i in range(4):
        dot(p, i, 8 + i, _)
        dot(p, i, 23 - i, _)
        dot(p, 119 - i, 8 + i, _)
        dot(p, 119 - i, 23 - i, _)
    # Inner dark area for text
    rect(p, 30, 10, 60, 12, DB)
    rect(p, 32, 11, 56, 10, ER)
    outline(p, 30, 10, 60, 12, K)
    # X marks
    for sx in [18, 100]:
        dot(p, sx - 1, 13, BR)
        dot(p, sx + 1, 13, BR)
        dot(p, sx, 14, BR)
        dot(p, sx - 1, 15, BR)
        dot(p, sx + 1, 15, BR)
    # "DEFEAT" block pattern
    rect(p, 38, 13, 44, 6, DB)
    rect(p, 40, 14, 40, 4, BR)
    return p


def make_rating_up():
    """Rating increase indicator — 16×16 green up arrow with + symbol."""
    f = blank(16, 16)
    # Up arrow
    for i in range(5):
        rect(f, 7 - i, 3 + i, 2 + i * 2, 1, FG)
    rect(f, 6, 8, 4, 5, FG)
    # Brighter center
    for i in range(4):
        rect(f, 8 - i, 4 + i, i * 2, 1, LG)
    rect(f, 7, 9, 2, 3, LG)
    # Plus symbol
    dot(f, 12, 3, BG)
    dot(f, 11, 4, BG)
    dot(f, 12, 4, BG)
    dot(f, 13, 4, BG)
    dot(f, 12, 5, BG)
    # Arrow outline
    for i in range(5):
        dot(f, 6 - i, 3 + i, K)
        dot(f, 9 + i, 3 + i, K)
    vline(f, 5, 8, 5, K)
    vline(f, 10, 8, 5, K)
    hline(f, 6, 13, 4, K)
    dot(f, 7, 2, K)
    dot(f, 8, 2, K)
    return f


def make_rating_down():
    """Rating decrease indicator — 16×16 red down arrow with - symbol."""
    f = blank(16, 16)
    # Down arrow
    for i in range(5):
        rect(f, 7 - i, 8 + i, 2 + i * 2, 1, ER)
    rect(f, 6, 3, 4, 5, ER)
    # Brighter center
    for i in range(4):
        rect(f, 8 - i, 9 + i, i * 2, 1, BR)
    rect(f, 7, 4, 2, 3, BR)
    # Minus symbol
    dot(f, 11, 4, BR)
    dot(f, 12, 4, BR)
    dot(f, 13, 4, BR)
    # Arrow outline
    for i in range(5):
        dot(f, 6 - i, 8 + i, K)
        dot(f, 9 + i, 8 + i, K)
    vline(f, 5, 3, 5, K)
    vline(f, 10, 3, 5, K)
    hline(f, 6, 2, 4, K)
    dot(f, 7, 13, K)
    dot(f, 8, 13, K)
    return f


# ═════════════════════════════════════════════════════════════════════════════
# 4. ARENA EQUIPMENT SPRITES (16×24 per frame, 2 frames each = 32×24)
# ═════════════════════════════════════════════════════════════════════════════

def make_gladiator_helm():
    """Gladiator Helm — golden helm with red crest, 2 frames (normal + glow)."""
    f1 = blank(16, 24)
    # Helm dome
    rect(f1, 4, 4, 8, 8, DG)
    rect(f1, 5, 5, 6, 6, GD)
    rect(f1, 3, 8, 10, 6, DG)
    rect(f1, 4, 9, 8, 4, GD)
    # Face opening
    rect(f1, 6, 10, 4, 3, K)
    rect(f1, 6, 10, 4, 1, DK)
    # Red crest on top
    rect(f1, 6, 2, 4, 3, ER)
    rect(f1, 7, 1, 2, 2, BR)
    # Cheek guards
    rect(f1, 3, 10, 2, 4, DG)
    rect(f1, 11, 10, 2, 4, DG)
    # Gold highlights
    dot(f1, 5, 5, YL)
    dot(f1, 10, 5, YL)
    # Outline
    outline(f1, 3, 4, 10, 10, K)
    hline(f1, 6, 1, 4, K)

    # Frame 2: slight shimmer
    f2 = copy_frame(f1)
    dot(f2, 7, 4, PY)
    dot(f2, 8, 6, YL)
    dot(f2, 5, 8, PY)

    return hstack([f1, f2])


def make_arena_blade():
    """Arena Blade — ornate sword with purple-gold design, 2 frames (normal + glow)."""
    f1 = blank(16, 24)
    # Blade
    rect(f1, 7, 2, 2, 12, LS)
    rect(f1, 7, 2, 1, 12, NW)
    dot(f1, 7, 1, LS)  # tip
    # Edge highlights
    dot(f1, 6, 4, PG)
    dot(f1, 9, 4, MG)
    # Cross guard — gold
    rect(f1, 4, 14, 8, 2, GD)
    rect(f1, 5, 14, 6, 2, YL)
    outline(f1, 4, 14, 8, 2, K)
    # Purple gems in guard
    dot(f1, 5, 14, MV)
    dot(f1, 10, 14, MV)
    # Handle
    rect(f1, 7, 16, 2, 4, BN)
    rect(f1, 7, 16, 1, 4, DT)
    # Pommel — gold
    rect(f1, 6, 20, 4, 2, GD)
    rect(f1, 7, 20, 2, 2, YL)
    outline(f1, 6, 20, 4, 2, K)
    # Blade outline
    vline(f1, 6, 2, 12, K)
    vline(f1, 9, 2, 12, K)
    dot(f1, 7, 0, K)

    # Frame 2: purple glow on blade
    f2 = copy_frame(f1)
    dot(f2, 7, 3, SG)
    dot(f2, 8, 5, MV)
    dot(f2, 7, 7, SG)
    dot(f2, 8, 9, MV)

    return hstack([f1, f2])


def make_champion_cape():
    """Champion Cape — flowing purple+gold cape, 2 frames (still + flutter)."""
    f1 = blank(16, 24)
    # Cape body — draped from shoulders
    rect(f1, 4, 4, 8, 14, MP)
    rect(f1, 5, 5, 6, 12, MV)
    # Gold trim at top (shoulder line)
    hline(f1, 3, 3, 10, GD)
    hline(f1, 3, 4, 10, DG)
    # Gold trim at bottom
    hline(f1, 4, 17, 8, GD)
    hline(f1, 4, 18, 8, DG)
    # Cape folds / shading
    vline(f1, 6, 6, 10, MP)
    vline(f1, 9, 6, 10, SG)
    # Central emblem — gold star
    dot(f1, 7, 9, GD)
    dot(f1, 8, 9, GD)
    dot(f1, 7, 10, YL)
    dot(f1, 8, 10, YL)
    dot(f1, 6, 10, GD)
    dot(f1, 9, 10, GD)
    dot(f1, 7, 11, GD)
    dot(f1, 8, 11, GD)
    # Outline
    vline(f1, 3, 3, 15, K)
    vline(f1, 12, 3, 15, K)
    hline(f1, 4, 18, 8, K)

    # Frame 2: flutter — bottom shifts right
    f2 = copy_frame(f1)
    # Shift lower portion
    for y in range(14, 19):
        for x in range(12, 3, -1):
            if x + 1 < 16:
                f2[y][x + 1] = f2[y][x]
            f2[y][x] = _
    # Re-apply outline on shifted frame
    vline(f2, 4, 14, 4, K)
    vline(f2, 13, 14, 4, K)
    hline(f2, 5, 18, 8, K)

    return hstack([f1, f2])


# ═════════════════════════════════════════════════════════════════════════════
# 5. PVP CURRENCY ICON (16×16)
# ═════════════════════════════════════════════════════════════════════════════

def make_pvp_currency():
    """PvP Arena Token — crossed swords behind a purple gem, 16×16."""
    f = blank(16, 16)
    # Crossed swords (simplified as X lines)
    for i in range(10):
        dot(f, 3 + i, 3 + i, LS)
        dot(f, 12 - i, 3 + i, LS)
    for i in range(10):
        dot(f, 4 + i, 3 + i, MG)
        dot(f, 11 - i, 3 + i, MG)
    # Central gem
    rect(f, 5, 5, 6, 6, MP)
    rect(f, 6, 6, 4, 4, MV)
    rect(f, 7, 7, 2, 2, SG)
    outline(f, 5, 5, 6, 6, K)
    # Gold setting around gem
    dot(f, 7, 4, GD)
    dot(f, 8, 4, GD)
    dot(f, 4, 7, GD)
    dot(f, 4, 8, GD)
    dot(f, 11, 7, GD)
    dot(f, 11, 8, GD)
    dot(f, 7, 11, GD)
    dot(f, 8, 11, GD)
    # Sword hilts (top-left and top-right)
    dot(f, 2, 2, DG)
    dot(f, 13, 2, DG)
    return f


# ═════════════════════════════════════════════════════════════════════════════
# 6. ARENA NPC — PVP QUEUE MASTER (16×24, 4 frames)
# ═════════════════════════════════════════════════════════════════════════════

def make_arena_master_npc():
    """
    Arena Queue Master NPC — armored figure with purple+gold tabard, holding a banner.
    4 frames: idle1, idle2 (slight sway), interact1, interact2 (arm raised).
    16×24 per frame → 64×24 spritesheet.
    """
    # Frame 1: idle stance
    f1 = blank(16, 24)
    # Boots
    rect(f1, 5, 20, 3, 3, DK)
    rect(f1, 9, 20, 3, 3, DK)
    hline(f1, 5, 22, 3, K)
    hline(f1, 9, 22, 3, K)
    dot(f1, 4, 22, K)
    dot(f1, 12, 22, K)
    # Legs — dark pants
    rect(f1, 5, 17, 3, 3, DK)
    rect(f1, 9, 17, 3, 3, DK)
    # Torso — purple tabard over armor
    rect(f1, 4, 10, 9, 7, MP)
    rect(f1, 5, 11, 7, 5, MV)
    # Gold belt
    hline(f1, 4, 16, 9, GD)
    hline(f1, 4, 17, 9, DG)
    # Gold trim on tabard
    vline(f1, 4, 10, 7, GD)
    vline(f1, 12, 10, 7, GD)
    hline(f1, 4, 10, 9, GD)
    # Central emblem on chest
    dot(f1, 7, 12, GD)
    dot(f1, 8, 12, GD)
    dot(f1, 7, 13, YL)
    dot(f1, 8, 13, YL)
    dot(f1, 9, 12, GD)
    # Armor shoulders
    rect(f1, 3, 9, 3, 2, ST)
    rect(f1, 11, 9, 3, 2, ST)
    outline(f1, 3, 9, 3, 2, K)
    outline(f1, 11, 9, 3, 2, K)
    # Arms
    rect(f1, 3, 11, 2, 5, ST)
    rect(f1, 12, 11, 2, 5, ST)
    # Head
    rect(f1, 6, 4, 5, 5, PG)   # face
    rect(f1, 6, 3, 5, 2, DG)   # helm
    rect(f1, 5, 3, 7, 1, GD)   # helm brow
    dot(f1, 8, 3, YL)          # helm gem
    # Eyes
    dot(f1, 7, 6, K)
    dot(f1, 9, 6, K)
    # Mouth
    dot(f1, 8, 8, DK)
    # Banner in right hand
    vline(f1, 14, 4, 12, BN)   # pole
    rect(f1, 14, 4, 2, 6, ER)  # banner flag
    rect(f1, 14, 5, 2, 4, BR)
    dot(f1, 14, 6, YL)         # emblem on banner

    # Frame 2: idle sway (shift right foot slightly)
    f2 = copy_frame(f1)
    # Slight body shift — move banner dot
    dot(f2, 14, 7, YL)
    dot(f2, 14, 6, BR)
    # Subtle leg shift
    rect(f2, 9, 20, 3, 3, _)
    rect(f2, 10, 20, 3, 3, DK)
    hline(f2, 10, 22, 3, K)
    dot(f2, 13, 22, K)

    # Frame 3: interact — arm raised
    f3 = copy_frame(f1)
    # Raise left arm
    rect(f3, 3, 11, 2, 5, _)
    rect(f3, 2, 7, 2, 5, ST)
    dot(f3, 2, 6, PG)   # hand up
    dot(f3, 3, 6, PG)
    # Glow effect on hand
    dot(f3, 1, 6, YL)
    dot(f3, 2, 5, YL)

    # Frame 4: interact — arm down + glow
    f4 = copy_frame(f3)
    # Lower arm back slightly
    rect(f4, 2, 7, 2, 5, _)
    rect(f4, 2, 9, 2, 5, ST)
    dot(f4, 2, 8, PG)
    dot(f4, 3, 8, PG)
    # Glow on chest emblem
    dot(f4, 7, 12, PY)
    dot(f4, 8, 12, PY)
    dot(f4, 7, 13, PY)
    dot(f4, 8, 13, PY)

    return hstack([f1, f2, f3, f4])


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

def main():
    print('=== PvP Arena Assets (PIX-268) ===\n')

    # 1. Arena battle backgrounds
    print('[Arena Backgrounds]')
    for name, fn in [
        ('bg_arena_colosseum',   make_bg_colosseum),
        ('bg_arena_shadow_pit',  make_bg_shadow_pit),
        ('bg_arena_sky_platform', make_bg_sky_platform),
    ]:
        pixels = fn()
        dual_write(
            os.path.join(ART_BG, f'{name}.png'),
            f'{name}.png',
            pixels
        )

    # 2. Champion rank badge
    print('\n[Champion Rank Badge]')
    pixels = make_rank_champion()
    dual_write(
        os.path.join(ART_ICONS, 'icon_rank_arena_champion.png'),
        'icon_rank_arena_champion.png',
        pixels
    )

    # 3. Matchmaking UI sprites
    print('\n[Matchmaking UI]')
    for name, fn in [
        ('ui_arena_timer',       make_arena_timer),
        ('ui_arena_vs_splash',   make_vs_splash),
        ('ui_arena_banner_win',  make_banner_win),
        ('ui_arena_banner_loss', make_banner_loss),
    ]:
        pixels = fn()
        dual_write(
            os.path.join(ART_ARENA, f'{name}.png'),
            f'{name}.png',
            pixels
        )

    # Rating change indicators go in icons
    for name, fn in [
        ('ui_arena_rating_up',   make_rating_up),
        ('ui_arena_rating_down', make_rating_down),
    ]:
        pixels = fn()
        dual_write(
            os.path.join(ART_ARENA, f'{name}.png'),
            f'{name}.png',
            pixels
        )

    # 4. Arena equipment sprites
    print('\n[Arena Equipment]')
    for name, fn in [
        ('equip_pvp_gladiator_helm',  make_gladiator_helm),
        ('equip_pvp_arena_blade',     make_arena_blade),
        ('equip_pvp_champion_cape',   make_champion_cape),
    ]:
        pixels = fn()
        dual_write(
            os.path.join(ART_EQUIP, f'{name}.png'),
            f'{name}.png',
            pixels
        )

    # 5. PvP currency icon
    print('\n[PvP Currency]')
    pixels = make_pvp_currency()
    dual_write(
        os.path.join(ART_ICONS, 'icon_currency_pvp.png'),
        'icon_currency_pvp.png',
        pixels
    )

    # 6. Arena NPC
    print('\n[Arena NPC]')
    pixels = make_arena_master_npc()
    dual_write(
        os.path.join(ART_CHARS, 'char_npc_arena_master.png'),
        'char_npc_arena_master.png',
        pixels
    )

    print('\nDone! All PvP ranked arena assets generated.')


if __name__ == '__main__':
    main()
