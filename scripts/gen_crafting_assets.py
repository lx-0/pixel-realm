#!/usr/bin/env python3
"""
Generate crafting system art assets for PixelRealm (PIX-66).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  Crafting station sprites (32×32 × 4 frames = 128×32 spritesheets):
    station_anvil.png           — blacksmith anvil with forge glow
    station_alchemy_table.png   — alchemy table with bubbling flask
    station_workbench.png       — carpentry workbench with tools

  Crafting material icons (16×16):
    icon_mat_iron_ore.png       — iron ore chunk
    icon_mat_gold_ore.png       — gold ore nugget
    icon_mat_crystal.png        — magic crystal
    icon_mat_herb_green.png     — green herb
    icon_mat_herb_red.png       — red herb (healing)
    icon_mat_herb_blue.png      — blue herb (mana)
    icon_mat_gem_ruby.png       — ruby gemstone
    icon_mat_gem_sapphire.png   — sapphire gemstone
    icon_mat_gem_emerald.png    — emerald gemstone
    icon_mat_leather.png        — tanned leather
    icon_mat_wood.png           — lumber plank
    icon_mat_cloth.png          — cloth bolt
    icon_mat_bone.png           — monster bone
    icon_mat_feather.png        — feather
    icon_mat_venom.png          — venom vial
    icon_mat_coal.png           — coal lump
    icon_mat_moonstone.png      — moonstone shard

  Crafted item icons (16×16):
    icon_craft_iron_sword.png   — basic iron sword
    icon_craft_gold_ring.png    — gold ring accessory
    icon_craft_leather_armor.png— leather chest armor
    icon_craft_wooden_shield.png— wooden shield
    icon_craft_health_potion.png— red health potion
    icon_craft_mana_potion.png  — blue mana potion
    icon_craft_fire_scroll.png  — fire spell scroll
    icon_craft_iron_helm.png    — iron helmet
    icon_craft_bow.png          — wooden bow
    icon_craft_pickaxe.png      — mining pickaxe
    icon_craft_staff.png        — magic staff
    icon_craft_boots.png        — leather boots

  UI panel:
    ui_panel_crafting.png       — 220×180 crafting panel

  Progress bar (80×10 × 8 frames = 640×10 spritesheet):
    ui_craft_progress.png       — crafting progress bar animation

  VFX spritesheets:
    vfx_craft_success.png       — 6 frames × 32×32 = 192×32
    vfx_craft_failure.png       — 6 frames × 32×32 = 192×32
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR    = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI     = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_PANELS = os.path.join(ART_UI, 'panels')
ART_ICONS  = os.path.join(ART_UI, 'icons')
ART_SPRITES = os.path.join(SCRIPT_DIR, '..', 'assets', 'sprites')
ART_STATIONS = os.path.join(ART_SPRITES, 'stations')
ART_VFX    = os.path.join(SCRIPT_DIR, '..', 'assets', 'vfx')

for d in [OUT_DIR, ART_PANELS, ART_ICONS, ART_STATIONS, ART_VFX]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — from master 32-color palette ────────────────────

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
DT  = (139, 92,  42,  255)  # dirt / wood
SN  = (184, 132, 63,  255)  # sand / light wood
DS  = (212, 168, 90,  255)  # desert gold
PS  = (232, 208, 138, 255)  # pale sand

# Greens
DF  = (26,  58,  26,  255)  # deep forest
FG  = (45,  110, 45,  255)  # forest green
LG  = (76,  155, 76,  255)  # leaf green
BG  = (120, 200, 120, 255)  # bright grass

# Cyan / player-friendly
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / highlight

# Red / danger
DB  = (90,  10,  10,  255)  # deep blood
ER  = (160, 16,  16,  255)  # enemy red
BR  = (212, 32,  32,  255)  # bright red
FR  = (240, 96,  32,  255)  # fire orange

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


def blank(w, h, fill=_):
    return [[fill] * w for _ in range(h)]


def hstack(frames):
    """Horizontally concatenate pixel grids (same height)."""
    result = []
    h = len(frames[0])
    for r in range(h):
        row = []
        for f in frames:
            row.extend(f[r])
        result.append(row)
    return result


def draw_rect(grid, x, y, w, h, color):
    for ry in range(y, min(y + h, len(grid))):
        for rx in range(x, min(x + w, len(grid[0]))):
            grid[ry][rx] = color


def draw_rect_outline(grid, x, y, w, h, color):
    for rx in range(x, min(x + w, len(grid[0]))):
        if y < len(grid):
            grid[y][rx] = color
        if y + h - 1 < len(grid):
            grid[y + h - 1][rx] = color
    for ry in range(y, min(y + h, len(grid))):
        if x < len(grid[0]):
            grid[ry][x] = color
        if x + w - 1 < len(grid[0]):
            grid[ry][x + w - 1] = color


def set_pixel(grid, x, y, color):
    if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
        grid[y][x] = color


def copy_frame(src):
    """Deep copy a pixel grid."""
    return [row[:] for row in src]


# ─── Crafting Station Sprites ────────────────────────────────────────────────
# Each station: 32×32, 4 frames (idle1, idle2 glow-up, idle3 glow-peak, idle4 glow-down)
# Spritesheet: 128×32

def gen_anvil():
    """Blacksmith anvil with ember glow cycle. 4 frames × 32×32."""

    def make_base():
        g = blank(32, 32)
        # Anvil body — stone/iron gray
        #   Base block
        draw_rect(g, 8, 24, 16, 6, DK)    # base
        draw_rect(g, 9, 24, 14, 5, ST)    # base highlight
        draw_rect(g, 6, 22, 20, 3, DK)    # wide base lip
        draw_rect(g, 7, 22, 18, 2, ST)
        #   Anvil top — horn shape
        draw_rect(g, 10, 16, 12, 7, ST)   # main block
        draw_rect(g, 11, 17, 10, 5, MG)   # highlight
        draw_rect(g, 8, 18, 3, 4, ST)     # left horn
        draw_rect(g, 21, 17, 4, 3, ST)    # right horn taper
        set_pixel(g, 22, 17, MG)
        #   Top surface highlight
        draw_rect(g, 11, 16, 10, 1, LS)
        set_pixel(g, 12, 16, PG)
        #   Outline
        for x in range(8, 24):
            set_pixel(g, x, 15, K)        # top outline
        for x in range(6, 26):
            set_pixel(g, x, 29, K)        # bottom outline
        for y in range(16, 30):
            if 22 <= y <= 29:
                set_pixel(g, 6, y, K)
                set_pixel(g, 25, y, K)
            elif 16 <= y < 22:
                set_pixel(g, 8, y, K)
                set_pixel(g, 23, y, K)
        return g

    frames = []
    # Frame 0: idle — no glow
    f0 = make_base()
    frames.append(f0)

    # Frame 1: faint ember glow beneath
    f1 = make_base()
    for x in range(10, 22):
        set_pixel(f1, x, 30, DB)
    for x in range(12, 20):
        set_pixel(f1, x, 31, (90, 10, 10, 128))
    frames.append(f1)

    # Frame 2: bright ember glow
    f2 = make_base()
    for x in range(9, 23):
        set_pixel(f2, x, 30, ER)
    for x in range(11, 21):
        set_pixel(f2, x, 31, FR)
    # Spark pixels
    set_pixel(f2, 14, 14, YL)
    set_pixel(f2, 18, 13, FR)
    frames.append(f2)

    # Frame 3: cooling down glow
    f3 = make_base()
    for x in range(10, 22):
        set_pixel(f3, x, 30, DB)
    set_pixel(f3, 16, 14, FR)
    frames.append(f3)

    return hstack(frames)


def gen_alchemy_table():
    """Alchemy table with bubbling flask. 4 frames × 32×32."""

    def make_base():
        g = blank(32, 32)
        # Table legs
        draw_rect(g, 6, 24, 2, 8, BD)
        draw_rect(g, 24, 24, 2, 8, BD)
        # Table top
        draw_rect(g, 4, 22, 24, 3, DT)
        draw_rect(g, 5, 22, 22, 2, SN)
        draw_rect(g, 4, 21, 24, 1, BN)  # edge
        # Outline
        draw_rect_outline(g, 4, 21, 24, 4, K)
        set_pixel(g, 6, 25, K)
        set_pixel(g, 6, 31, K)
        set_pixel(g, 7, 31, K)
        set_pixel(g, 24, 25, K)
        set_pixel(g, 24, 31, K)
        set_pixel(g, 25, 31, K)
        for y in range(25, 32):
            set_pixel(g, 5, y, K)
            set_pixel(g, 8, y, K)
            set_pixel(g, 23, y, K)
            set_pixel(g, 26, y, K)
        # Flask body (center of table)
        draw_rect(g, 14, 14, 4, 7, DP)
        draw_rect(g, 15, 14, 2, 6, SB)
        # Flask neck
        draw_rect(g, 15, 11, 2, 3, DP)
        set_pixel(g, 15, 11, SB)
        # Flask outline
        set_pixel(g, 13, 14, K)
        set_pixel(g, 18, 14, K)
        for y in range(14, 21):
            set_pixel(g, 13, y, K)
            set_pixel(g, 18, y, K)
        for x in range(14, 18):
            set_pixel(g, x, 21, K)
        set_pixel(g, 14, 11, K)
        set_pixel(g, 17, 11, K)
        set_pixel(g, 14, 10, K)
        set_pixel(g, 17, 10, K)
        # Small book on left
        draw_rect(g, 7, 18, 5, 3, PM)
        draw_rect(g, 8, 18, 3, 2, MP)
        set_pixel(g, 9, 19, SG)  # page
        return g

    frames = []
    # Frame 0: no bubbles
    frames.append(make_base())

    # Frame 1: one bubble
    f1 = make_base()
    set_pixel(f1, 15, 16, HB)
    frames.append(f1)

    # Frame 2: two bubbles rising
    f2 = make_base()
    set_pixel(f2, 16, 14, HB)
    set_pixel(f2, 15, 17, PB)
    # Steam wisp
    set_pixel(f2, 15, 9, (144, 208, 248, 128))
    set_pixel(f2, 16, 8, (144, 208, 248, 80))
    frames.append(f2)

    # Frame 3: bubble popping, steam
    f3 = make_base()
    set_pixel(f3, 16, 15, PB)
    set_pixel(f3, 15, 9, (144, 208, 248, 100))
    set_pixel(f3, 17, 8, (144, 208, 248, 60))
    frames.append(f3)

    return hstack(frames)


def gen_workbench():
    """Carpentry workbench with saw/hammer. 4 frames × 32×32."""

    def make_base():
        g = blank(32, 32)
        # Bench legs (sturdy)
        draw_rect(g, 5, 24, 3, 8, BD)
        draw_rect(g, 24, 24, 3, 8, BD)
        draw_rect(g, 6, 25, 1, 6, BN)  # highlight
        draw_rect(g, 25, 25, 1, 6, BN)
        # Cross brace
        for x in range(8, 24):
            set_pixel(g, x, 28, BD)
            set_pixel(g, x, 29, BN)
        # Bench top — thick wooden plank
        draw_rect(g, 3, 20, 26, 5, DT)
        draw_rect(g, 4, 20, 24, 4, SN)
        draw_rect(g, 4, 20, 24, 1, DS)  # top highlight
        # Wood grain lines
        for x in range(6, 26, 4):
            for y in range(21, 24):
                set_pixel(g, x, y, DT)
        # Outline
        draw_rect_outline(g, 3, 19, 26, 6, K)
        for y in range(25, 32):
            set_pixel(g, 4, y, K)
            set_pixel(g, 8, y, K)
            set_pixel(g, 23, y, K)
            set_pixel(g, 27, y, K)
        # Saw on bench top
        # Handle
        set_pixel(g, 20, 18, BD)
        set_pixel(g, 21, 18, BN)
        set_pixel(g, 20, 17, BN)
        # Blade
        for x in range(22, 28):
            set_pixel(g, x, 18, LS)
        set_pixel(g, 27, 17, LS)
        # Teeth
        for x in range(22, 27):
            set_pixel(g, x, 19, MG)
        # Hammer on left side
        set_pixel(g, 8, 18, BN)   # handle
        set_pixel(g, 8, 17, BN)
        set_pixel(g, 8, 16, BN)
        set_pixel(g, 7, 15, ST)   # head
        set_pixel(g, 8, 15, MG)
        set_pixel(g, 9, 15, ST)
        return g

    frames = []
    # Frame 0: idle
    frames.append(make_base())

    # Frame 1: slight wood shaving particle
    f1 = make_base()
    set_pixel(f1, 15, 18, DS)
    set_pixel(f1, 17, 17, SN)
    frames.append(f1)

    # Frame 2: more particles
    f2 = make_base()
    set_pixel(f2, 14, 17, DS)
    set_pixel(f2, 16, 16, SN)
    set_pixel(f2, 18, 18, PS)
    frames.append(f2)

    # Frame 3: settling
    f3 = make_base()
    set_pixel(f3, 16, 18, DS)
    frames.append(f3)

    return hstack(frames)


# ─── Crafting Material Icons (16×16) ─────────────────────────────────────────

def gen_icon_iron_ore():
    g = blank(16, 16)
    # Rocky ore chunk — gray with metallic highlights
    for dy, row in enumerate([
        [_, _, _, _, _, _, K, K, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, K, ST,MG,ST, K, _, _, _, _, _, _],
        [_, _, _, _, K, MG,LS,MG,ST,MG, K, _, _, _, _, _],
        [_, _, _, K, ST,MG,LS,LS,MG,ST,MG, K, _, _, _, _],
        [_, _, K, MG,ST,LS,PG,LS,MG,ST,DK,ST, K, _, _, _],
        [_, _, K, ST,MG,LS,MG,ST,DK,MG,ST,DK, K, _, _, _],
        [_, _, K, DK,ST,MG,ST,DK,ST,DK,ST,MG, K, _, _, _],
        [_, _, _, K, DK,ST,DK,ST,MG,ST,DK, K, _, _, _, _],
        [_, _, _, _, K, K, DK,ST,DK, K, K, _, _, _, _, _],
        [_, _, _, _, _, _, K, K, K, _, _, _, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 2 + dx, 3 + dy, c)
    return g


def gen_icon_gold_ore():
    g = blank(16, 16)
    for dy, row in enumerate([
        [_, _, _, _, _, K, K, K, _, _, _, _, _],
        [_, _, _, _, K, DG,GD,DG, K, _, _, _, _],
        [_, _, _, K, GD,YL,GD,DG,GD, K, _, _, _],
        [_, _, K, DG,GD,YL,YL,GD,DG,DG, K, _, _],
        [_, _, K, GD,YL,PY,YL,GD,DG,GD, K, _, _],
        [_, _, K, DG,GD,YL,GD,DG,GD,DG, K, _, _],
        [_, _, _, K, DG,GD,DG,DG,DG, K, _, _, _],
        [_, _, _, _, K, DG,DG,DG, K, _, _, _, _],
        [_, _, _, _, _, K, K, K, _, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 2 + dx, 3 + dy, c)
    return g


def gen_icon_crystal():
    g = blank(16, 16)
    # Magic crystal — purple with bright highlights
    for dy, row in enumerate([
        [_, _, _, _, _, _, _, K, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, MV, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, K, MV,SG,MV, K, _, _, _, _, _, _],
        [_, _, _, _, K, MP,MV,SG,MV,MP, K, _, _, _, _, _],
        [_, _, _, K, PM,MP,MV,SG,MV,MP,PM, K, _, _, _, _],
        [_, _, _, K, PM,MP,SG,MV,MP,PM,PM, K, _, _, _, _],
        [_, _, _, _, K, PM,MP,MV,MP,PM, K, _, _, _, _, _],
        [_, _, _, _, _, K, PM,MP,PM, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, PM, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, _, _, _, _, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, dx, 3 + dy, c)
    return g


def gen_icon_herb(primary, secondary, accent):
    """Generic herb icon with configurable colors."""
    g = blank(16, 16)
    # Stem
    for y in range(8, 14):
        set_pixel(g, 8, y, DF)
    set_pixel(g, 7, 13, DF)
    # Leaves
    set_pixel(g, 6, 5, primary)
    set_pixel(g, 7, 4, primary)
    set_pixel(g, 8, 3, accent)
    set_pixel(g, 9, 4, secondary)
    set_pixel(g, 10, 5, primary)
    set_pixel(g, 7, 5, secondary)
    set_pixel(g, 8, 4, secondary)
    set_pixel(g, 9, 5, secondary)
    set_pixel(g, 7, 6, primary)
    set_pixel(g, 8, 5, accent)
    set_pixel(g, 9, 6, primary)
    set_pixel(g, 5, 6, primary)
    set_pixel(g, 6, 6, secondary)
    set_pixel(g, 10, 6, secondary)
    set_pixel(g, 11, 6, primary)
    set_pixel(g, 8, 7, DF)
    # Outline
    set_pixel(g, 8, 2, K)
    set_pixel(g, 5, 5, K)
    set_pixel(g, 11, 5, K)
    set_pixel(g, 8, 14, K)
    return g


def gen_icon_gem(primary, bright, dark):
    """Generic faceted gem icon."""
    g = blank(16, 16)
    for dy, row in enumerate([
        [_, _, _, K, K, K, K, _, _, _],
        [_, _, K, bright, bright, primary, primary, K, _, _],
        [_, K, bright, bright, primary, primary, dark, dark, K, _],
        [K, bright, bright, primary, primary, dark, dark, dark, dark, K],
        [K, primary, primary, primary, dark, dark, dark, dark, dark, K],
        [_, K, primary, dark, dark, dark, dark, dark, K, _],
        [_, _, K, dark, dark, dark, dark, K, _, _],
        [_, _, _, K, K, K, K, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 3 + dx, 4 + dy, c)
    return g


def gen_icon_leather():
    g = blank(16, 16)
    # Rolled leather piece
    draw_rect(g, 4, 5, 8, 7, BN)
    draw_rect(g, 5, 6, 6, 5, DT)
    draw_rect(g, 5, 6, 6, 1, SN)  # highlight edge
    # Stitching
    for x in range(5, 11, 2):
        set_pixel(g, x, 10, BD)
    # Curled edge
    set_pixel(g, 4, 5, BD)
    set_pixel(g, 11, 5, BD)
    set_pixel(g, 4, 11, BD)
    set_pixel(g, 11, 11, BD)
    # Outline
    draw_rect_outline(g, 3, 4, 10, 9, K)
    return g


def gen_icon_wood():
    g = blank(16, 16)
    # Wood plank
    draw_rect(g, 3, 5, 10, 7, DT)
    draw_rect(g, 4, 6, 8, 5, SN)
    # Grain lines
    for y in range(6, 11):
        set_pixel(g, 6, y, DT)
        set_pixel(g, 9, y, DT)
    # End grain circles
    set_pixel(g, 5, 7, BN)
    set_pixel(g, 10, 9, BN)
    # Bark edge
    draw_rect(g, 3, 5, 1, 7, BD)
    # Outline
    draw_rect_outline(g, 2, 4, 12, 9, K)
    return g


def gen_icon_cloth():
    g = blank(16, 16)
    # Folded cloth bolt
    draw_rect(g, 4, 5, 8, 7, PB)
    draw_rect(g, 5, 6, 6, 5, HB)
    # Fold lines
    for x in range(5, 11):
        set_pixel(g, x, 8, PB)
    set_pixel(g, 5, 7, SB)
    set_pixel(g, 10, 7, SB)
    # Thread detail
    set_pixel(g, 7, 6, NW)
    set_pixel(g, 8, 6, NW)
    # Outline
    draw_rect_outline(g, 3, 4, 10, 9, K)
    return g


def gen_icon_bone():
    g = blank(16, 16)
    # Bone shape — horizontal with knobs
    # Left knob
    set_pixel(g, 3, 6, PG)
    set_pixel(g, 4, 6, NW)
    set_pixel(g, 3, 7, NW)
    set_pixel(g, 4, 7, PG)
    set_pixel(g, 3, 9, PG)
    set_pixel(g, 4, 9, NW)
    set_pixel(g, 3, 10, NW)
    set_pixel(g, 4, 10, PG)
    # Shaft
    for x in range(5, 11):
        set_pixel(g, x, 7, PG)
        set_pixel(g, x, 8, NW)
        set_pixel(g, x, 9, PG)
    # Right knob
    set_pixel(g, 11, 6, PG)
    set_pixel(g, 12, 6, NW)
    set_pixel(g, 11, 7, NW)
    set_pixel(g, 12, 7, PG)
    set_pixel(g, 11, 9, PG)
    set_pixel(g, 12, 9, NW)
    set_pixel(g, 11, 10, NW)
    set_pixel(g, 12, 10, PG)
    # Cracks
    set_pixel(g, 7, 8, LS)
    set_pixel(g, 9, 7, LS)
    # Outline accents
    set_pixel(g, 2, 6, K)
    set_pixel(g, 2, 10, K)
    set_pixel(g, 13, 6, K)
    set_pixel(g, 13, 10, K)
    for x in range(5, 11):
        set_pixel(g, x, 6, K)
        set_pixel(g, x, 10, K)
    return g


def gen_icon_feather():
    g = blank(16, 16)
    # Quill — diagonal feather
    # Shaft
    for i in range(10):
        set_pixel(g, 5 + i, 12 - i, PG)
    # Barbs (left side of shaft)
    set_pixel(g, 5, 10, NW)
    set_pixel(g, 6, 9, NW)
    set_pixel(g, 7, 8, NW)
    set_pixel(g, 4, 9, LS)
    set_pixel(g, 5, 8, LS)
    set_pixel(g, 6, 7, LS)
    # Barbs (right side)
    set_pixel(g, 8, 9, NW)
    set_pixel(g, 9, 8, NW)
    set_pixel(g, 10, 7, NW)
    set_pixel(g, 9, 10, LS)
    set_pixel(g, 10, 9, LS)
    set_pixel(g, 11, 8, LS)
    # Tip
    set_pixel(g, 12, 4, PG)
    set_pixel(g, 13, 3, NW)
    set_pixel(g, 11, 5, LS)
    # Quill base
    set_pixel(g, 4, 13, DT)
    set_pixel(g, 3, 14, BN)
    return g


def gen_icon_venom():
    g = blank(16, 16)
    # Vial with green liquid
    # Vial body
    draw_rect(g, 6, 7, 4, 6, FG)
    draw_rect(g, 7, 8, 2, 4, LG)
    # Vial neck
    set_pixel(g, 7, 5, LS)
    set_pixel(g, 8, 5, LS)
    set_pixel(g, 7, 6, MG)
    set_pixel(g, 8, 6, MG)
    # Cork
    set_pixel(g, 7, 4, BN)
    set_pixel(g, 8, 4, DT)
    # Bubble
    set_pixel(g, 7, 9, BG)
    # Skull mark
    set_pixel(g, 7, 11, K)
    set_pixel(g, 8, 11, K)
    # Outline
    set_pixel(g, 5, 7, K)
    set_pixel(g, 10, 7, K)
    for y in range(7, 13):
        set_pixel(g, 5, y, K)
        set_pixel(g, 10, y, K)
    for x in range(6, 10):
        set_pixel(g, x, 13, K)
    set_pixel(g, 6, 5, K)
    set_pixel(g, 9, 5, K)
    set_pixel(g, 6, 4, K)
    set_pixel(g, 9, 4, K)
    return g


def gen_icon_coal():
    g = blank(16, 16)
    # Dark lumpy coal chunk
    for dy, row in enumerate([
        [_, _, _, _, _, K, K, K, _, _, _, _],
        [_, _, _, _, K, DK, K,DK, K, _, _, _],
        [_, _, _, K, K, DK,DK, K,DK, K, _, _],
        [_, _, K, DK,DK, K,DK,DK,DK,DK, K, _],
        [_, _, K, DK,DK,DK,DK,ST,DK,DK, K, _],
        [_, _, K,  K,DK,DK,DK,DK,DK, K, K, _],
        [_, _, _, K, DK,DK,DK,DK,DK, K, _, _],
        [_, _, _, _, K, K, K, K, K, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 2 + dx, 4 + dy, c)
    return g


def gen_icon_moonstone():
    g = blank(16, 16)
    # Luminous white-blue shard
    for dy, row in enumerate([
        [_, _, _, _, _, _, _, K, _, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, HB, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, K, PB,NW,HB, K, _, _, _, _, _, _],
        [_, _, _, _, K, SB,PB,NW,HB,PB, K, _, _, _, _, _],
        [_, _, _, K, DP,SB,PB,NW,PB,SB,DP, K, _, _, _, _],
        [_, _, _, _, K, DP,SB,PB,SB,DP, K, _, _, _, _, _],
        [_, _, _, _, _, K, DP,SB,DP, K, _, _, _, _, _, _],
        [_, _, _, _, _, _, K, DP, K, _, _, _, _, _, _, _],
        [_, _, _, _, _, _, _, K, _, _, _, _, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, dx, 3 + dy, c)
    return g


# ─── Crafted Item Icons (16×16) ──────────────────────────────────────────────

def gen_icon_iron_sword():
    g = blank(16, 16)
    # Diagonal sword — blade, crossguard, handle
    # Blade (top-right to center)
    set_pixel(g, 12, 2, NW)
    set_pixel(g, 11, 3, LS)
    set_pixel(g, 12, 3, PG)
    set_pixel(g, 10, 4, MG)
    set_pixel(g, 11, 4, LS)
    set_pixel(g, 9, 5, MG)
    set_pixel(g, 10, 5, LS)
    set_pixel(g, 8, 6, ST)
    set_pixel(g, 9, 6, MG)
    set_pixel(g, 7, 7, ST)
    set_pixel(g, 8, 7, MG)
    # Crossguard
    set_pixel(g, 5, 8, DG)
    set_pixel(g, 6, 8, GD)
    set_pixel(g, 7, 8, GD)
    set_pixel(g, 8, 8, GD)
    set_pixel(g, 9, 8, DG)
    # Handle
    set_pixel(g, 6, 9, BN)
    set_pixel(g, 5, 10, BD)
    set_pixel(g, 6, 10, BN)
    set_pixel(g, 5, 11, BD)
    # Pommel
    set_pixel(g, 4, 12, DG)
    set_pixel(g, 5, 12, GD)
    # Edge highlights
    set_pixel(g, 13, 1, K)
    set_pixel(g, 3, 12, K)
    return g


def gen_icon_gold_ring():
    g = blank(16, 16)
    # Ring shape — oval
    for dy, row in enumerate([
        [_, _, _, _, K, K, K, K, _, _, _, _],
        [_, _, _, K, GD,YL,YL,GD, K, _, _, _],
        [_, _, K, GD, _, _, _, _, GD, K, _, _],
        [_, _, K, DG, _, _, _, _, YL, K, _, _],
        [_, _, K, DG, _, _, _, _, GD, K, _, _],
        [_, _, _, K, DG,DG,DG,GD, K, _, _, _],
        [_, _, _, _, K, K, K, K, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 2 + dx, 4 + dy, c)
    # Gem on top
    set_pixel(g, 7, 3, BR)
    set_pixel(g, 8, 3, ER)
    set_pixel(g, 7, 4, ER)
    set_pixel(g, 8, 4, DB)
    return g


def gen_icon_leather_armor():
    g = blank(16, 16)
    # Chest armor front view
    # Shoulders
    draw_rect(g, 3, 4, 3, 2, BN)
    draw_rect(g, 10, 4, 3, 2, BN)
    # Body
    draw_rect(g, 5, 3, 6, 10, DT)
    draw_rect(g, 6, 4, 4, 8, SN)
    # Collar
    set_pixel(g, 6, 3, BN)
    set_pixel(g, 7, 2, BN)
    set_pixel(g, 8, 2, BN)
    set_pixel(g, 9, 3, BN)
    # Belt
    draw_rect(g, 5, 10, 6, 1, BD)
    set_pixel(g, 8, 10, GD)  # buckle
    # Stitching
    for y in range(5, 10):
        set_pixel(g, 8, y, DT)
    # Outline
    draw_rect_outline(g, 4, 2, 8, 12, K)
    set_pixel(g, 2, 4, K)
    set_pixel(g, 13, 4, K)
    set_pixel(g, 2, 5, K)
    set_pixel(g, 13, 5, K)
    return g


def gen_icon_wooden_shield():
    g = blank(16, 16)
    # Shield shape
    for dy, row in enumerate([
        [_, _, _, K, K, K, K, K, K, _, _, _],
        [_, _, K, DT,SN,SN,SN,SN,DT, K, _, _],
        [_, K, DT,SN,DS,SN,SN,DS,SN,DT, K, _],
        [_, K, DT,SN,SN,SN,SN,SN,SN,DT, K, _],
        [_, K, DT,SN,SN,GD,GD,SN,SN,DT, K, _],
        [_, K, DT,SN,GD,YL,YL,GD,SN,DT, K, _],
        [_, K, DT,SN,SN,GD,GD,SN,SN,DT, K, _],
        [_, _, K, DT,SN,SN,SN,SN,DT, K, _, _],
        [_, _, _, K, DT,SN,SN,DT, K, _, _, _],
        [_, _, _, _, K, DT,DT, K, _, _, _, _],
        [_, _, _, _, _, K, K, _, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 2 + dx, 2 + dy, c)
    return g


def gen_icon_health_potion():
    g = blank(16, 16)
    # Red potion flask
    # Flask body
    draw_rect(g, 5, 7, 6, 5, ER)
    draw_rect(g, 6, 8, 4, 3, BR)
    set_pixel(g, 7, 8, FR)  # highlight
    # Neck
    draw_rect(g, 7, 4, 2, 3, ER)
    set_pixel(g, 7, 5, BR)
    # Cork
    set_pixel(g, 7, 3, DT)
    set_pixel(g, 8, 3, BN)
    # Cross symbol
    set_pixel(g, 8, 9, NW)
    set_pixel(g, 7, 10, NW)
    set_pixel(g, 8, 10, NW)
    set_pixel(g, 9, 10, NW)
    set_pixel(g, 8, 11, NW)
    # Outline
    for y in range(7, 12):
        set_pixel(g, 4, y, K)
        set_pixel(g, 11, y, K)
    for x in range(5, 11):
        set_pixel(g, x, 12, K)
    set_pixel(g, 6, 4, K)
    set_pixel(g, 9, 4, K)
    set_pixel(g, 6, 3, K)
    set_pixel(g, 9, 3, K)
    return g


def gen_icon_mana_potion():
    g = blank(16, 16)
    # Blue potion flask
    draw_rect(g, 5, 7, 6, 5, DP)
    draw_rect(g, 6, 8, 4, 3, SB)
    set_pixel(g, 7, 8, PB)
    # Neck
    draw_rect(g, 7, 4, 2, 3, DP)
    set_pixel(g, 7, 5, SB)
    # Cork
    set_pixel(g, 7, 3, DT)
    set_pixel(g, 8, 3, BN)
    # Star symbol
    set_pixel(g, 8, 9, NW)
    set_pixel(g, 7, 10, NW)
    set_pixel(g, 9, 10, NW)
    set_pixel(g, 8, 11, NW)
    # Outline
    for y in range(7, 12):
        set_pixel(g, 4, y, K)
        set_pixel(g, 11, y, K)
    for x in range(5, 11):
        set_pixel(g, x, 12, K)
    set_pixel(g, 6, 4, K)
    set_pixel(g, 9, 4, K)
    set_pixel(g, 6, 3, K)
    set_pixel(g, 9, 3, K)
    return g


def gen_icon_fire_scroll():
    g = blank(16, 16)
    # Scroll with fire emblem
    # Rolled top
    draw_rect(g, 4, 3, 8, 2, PS)
    set_pixel(g, 4, 3, SN)
    set_pixel(g, 11, 3, SN)
    # Body
    draw_rect(g, 5, 5, 6, 7, PS)
    draw_rect(g, 6, 6, 4, 5, NW)
    # Rolled bottom
    draw_rect(g, 4, 12, 8, 2, PS)
    set_pixel(g, 4, 13, SN)
    set_pixel(g, 11, 13, SN)
    # Fire symbol
    set_pixel(g, 8, 7, FR)
    set_pixel(g, 7, 8, ER)
    set_pixel(g, 8, 8, YL)
    set_pixel(g, 9, 8, ER)
    set_pixel(g, 7, 9, FR)
    set_pixel(g, 8, 9, FR)
    set_pixel(g, 9, 9, FR)
    # Outline
    draw_rect_outline(g, 3, 2, 10, 13, K)
    return g


def gen_icon_iron_helm():
    g = blank(16, 16)
    # Helmet front view
    for dy, row in enumerate([
        [_, _, _, _, K, K, K, K, K, _, _, _],
        [_, _, _, K, ST,MG,LS,MG,ST, K, _, _],
        [_, _, K, ST,MG,LS,PG,LS,MG,ST, K, _],
        [_, _, K, MG,LS,MG,LS,MG,LS,MG, K, _],
        [_, _, K, ST, K, K, K, K, K,ST, K, _],
        [_, _, K, MG, K, _, _, _, K,MG, K, _],
        [_, _, K, ST,ST, K, K, K,ST,ST, K, _],
        [_, _, _, K, K,ST,MG,ST, K, K, _, _],
        [_, _, _, _, _, K, K, K, _, _, _, _],
    ]):
        for dx, c in enumerate(row):
            if c != _:
                set_pixel(g, 2 + dx, 3 + dy, c)
    # Nose guard highlight
    set_pixel(g, 8, 9, LS)
    return g


def gen_icon_bow():
    g = blank(16, 16)
    # Wooden bow with string
    # Bow limb (curved)
    set_pixel(g, 10, 2, BN)
    set_pixel(g, 11, 3, DT)
    set_pixel(g, 11, 4, SN)
    set_pixel(g, 11, 5, DT)
    set_pixel(g, 11, 6, SN)
    set_pixel(g, 10, 7, DT)
    set_pixel(g, 10, 8, BN)  # grip
    set_pixel(g, 10, 9, DT)
    set_pixel(g, 11, 10, SN)
    set_pixel(g, 11, 11, DT)
    set_pixel(g, 11, 12, SN)
    set_pixel(g, 10, 13, BN)
    # String
    for y in range(3, 13):
        set_pixel(g, 8, y, LS)
    # Arrow nocked
    set_pixel(g, 7, 8, ST)
    set_pixel(g, 6, 8, MG)
    set_pixel(g, 5, 8, MG)
    set_pixel(g, 4, 8, LS)  # arrowhead
    set_pixel(g, 3, 8, PG)
    # Tip
    set_pixel(g, 9, 2, K)
    set_pixel(g, 9, 13, K)
    return g


def gen_icon_pickaxe():
    g = blank(16, 16)
    # Pickaxe — diagonal
    # Handle
    for i in range(8):
        set_pixel(g, 4 + i, 5 + i, BN)
    set_pixel(g, 5, 6, DT)
    # Head (top-right)
    set_pixel(g, 9, 3, ST)
    set_pixel(g, 10, 2, MG)
    set_pixel(g, 11, 2, LS)
    set_pixel(g, 12, 3, MG)  # pick point
    set_pixel(g, 8, 4, ST)
    set_pixel(g, 7, 5, MG)
    set_pixel(g, 6, 4, LS)   # other point
    set_pixel(g, 5, 3, MG)
    # Outline on head
    set_pixel(g, 13, 3, K)
    set_pixel(g, 4, 3, K)
    set_pixel(g, 12, 1, K)
    set_pixel(g, 5, 2, K)
    return g


def gen_icon_staff():
    g = blank(16, 16)
    # Magic staff — vertical with crystal top
    # Staff shaft
    for y in range(5, 14):
        set_pixel(g, 8, y, BN)
        set_pixel(g, 7, y, BD)
    # Crystal orb on top
    set_pixel(g, 7, 2, MV)
    set_pixel(g, 8, 2, SG)
    set_pixel(g, 7, 3, MP)
    set_pixel(g, 8, 3, MV)
    set_pixel(g, 9, 3, SG)
    set_pixel(g, 8, 1, SG)
    # Prongs holding crystal
    set_pixel(g, 6, 4, DG)
    set_pixel(g, 9, 4, DG)
    set_pixel(g, 6, 3, DG)
    set_pixel(g, 10, 3, DG)
    # Outline
    set_pixel(g, 7, 1, K)
    set_pixel(g, 9, 1, K)
    set_pixel(g, 6, 2, K)
    set_pixel(g, 10, 2, K)
    set_pixel(g, 7, 14, K)
    set_pixel(g, 8, 14, K)
    return g


def gen_icon_boots():
    g = blank(16, 16)
    # Side-view leather boots
    # Boot shaft
    draw_rect(g, 6, 4, 4, 5, BN)
    draw_rect(g, 7, 5, 2, 3, DT)
    # Boot top trim
    draw_rect(g, 6, 4, 4, 1, SN)
    # Foot
    draw_rect(g, 4, 9, 7, 3, BN)
    draw_rect(g, 5, 9, 5, 2, DT)
    # Sole
    draw_rect(g, 3, 12, 9, 1, K)
    draw_rect(g, 4, 11, 7, 1, BD)
    # Toe cap
    set_pixel(g, 4, 9, BD)
    set_pixel(g, 4, 10, BD)
    # Lace detail
    set_pixel(g, 8, 6, SN)
    set_pixel(g, 8, 7, SN)
    # Outline
    draw_rect_outline(g, 5, 3, 6, 10, K)
    set_pixel(g, 3, 9, K)
    set_pixel(g, 3, 10, K)
    set_pixel(g, 3, 11, K)
    return g


# ─── Crafting UI Panel ───────────────────────────────────────────────────────

def gen_crafting_panel():
    """220×180 crafting panel — recipe list left, crafting area right."""
    W, H = 220, 180
    grid = blank(W, H)

    # Dark background
    BK = (0, 0, 0, 224)
    draw_rect(grid, 0, 0, W, H, BK)

    # Outer border — warm wood
    draw_rect_outline(grid, 0, 0, W, H, BN)
    draw_rect_outline(grid, 1, 1, W - 2, H - 2, DT)

    # Corner studs
    for cx, cy in [(2, 2), (W - 3, 2), (2, H - 3), (W - 3, H - 3)]:
        set_pixel(grid, cx, cy, GD)

    # Header bar
    draw_rect(grid, 2, 2, W - 4, 10, BD)
    draw_rect(grid, 2, 12, W - 4, 1, DT)

    # Anvil icon in header center
    for dy, row_data in enumerate([
        [_, _, ST, ST, ST, ST, _, _],
        [_, ST, MG, LS, MG, ST, ST, _],
        [ST, ST, ST, ST, ST, ST, ST, ST],
        [_, _, ST, ST, ST, ST, _, _],
        [_, ST, ST, ST, ST, ST, ST, _],
    ]):
        for dx, c in enumerate(row_data):
            if c != _:
                set_pixel(grid, W // 2 - 4 + dx, 3 + dy, c)

    # Gold accent dots along top
    for x in range(6, W - 6, 8):
        set_pixel(grid, x, 3, GD)
        set_pixel(grid, x, 10, GD)

    # Vertical divider — separating recipe list from crafting area
    div_x = 80
    for y in range(14, H - 3):
        set_pixel(grid, div_x, y, BN)
        if y % 3 == 0:
            set_pixel(grid, div_x - 1, y, (107, 58, 31, 80))
            set_pixel(grid, div_x + 1, y, (107, 58, 31, 80))

    # Left panel: Recipe list area
    draw_rect(grid, 3, 13, 76, 8, (20, 20, 20, 200))  # "Recipes" header area
    # Recipe slot lines
    for i in range(7):
        y = 24 + i * 18
        draw_rect(grid, 4, y, 74, 16, (17, 17, 17, 200))
        draw_rect_outline(grid, 4, y, 74, 16, (43, 43, 43, 120))
        # Icon slot in each recipe row
        draw_rect_outline(grid, 6, y + 1, 14, 14, (74, 74, 74, 150))
        draw_rect(grid, 7, y + 2, 12, 12, (30, 30, 30, 200))

    # Right panel: Crafting area
    # "Materials" section header
    draw_rect(grid, div_x + 2, 13, W - div_x - 5, 8, (20, 20, 20, 200))

    # Material input slots (3×2 grid)
    for row in range(2):
        for col in range(3):
            sx = div_x + 10 + col * 24
            sy = 26 + row * 24
            draw_rect_outline(grid, sx, sy, 20, 20, SN)
            draw_rect(grid, sx + 1, sy + 1, 18, 18, (25, 25, 25, 220))
            # Plus sign in empty slot
            for px in range(sx + 7, sx + 13):
                set_pixel(grid, px, sy + 10, (74, 74, 74, 100))
            for py in range(sy + 7, sy + 13):
                set_pixel(grid, sx + 10, py, (74, 74, 74, 100))

    # Arrow pointing down to result
    arrow_y = 78
    for dx in [-2, -1, 0, 1, 2]:
        set_pixel(grid, div_x + 46 + dx, arrow_y, SN)
        set_pixel(grid, div_x + 46 + dx, arrow_y + 1, SN)
    for dx in [-1, 0, 1]:
        set_pixel(grid, div_x + 46 + dx, arrow_y + 2, SN)
    set_pixel(grid, div_x + 46, arrow_y + 3, SN)

    # Result slot (larger, highlighted)
    rx, ry = div_x + 32, 86
    draw_rect_outline(grid, rx, ry, 28, 28, GD)
    draw_rect_outline(grid, rx + 1, ry + 1, 26, 26, DG)
    draw_rect(grid, rx + 2, ry + 2, 24, 24, (20, 15, 5, 200))

    # Progress bar placeholder
    bar_y = 120
    draw_rect(grid, div_x + 10, bar_y, 112, 12, (17, 17, 17, 230))
    draw_rect_outline(grid, div_x + 10, bar_y, 112, 12, DT)
    # Fill sample (40%)
    draw_rect(grid, div_x + 11, bar_y + 1, 44, 10, FR)
    draw_rect(grid, div_x + 11, bar_y + 1, 44, 3, YL)  # highlight

    # Craft button
    btn_x, btn_y = div_x + 24, 140
    btn_w, btn_h = 80, 16
    draw_rect(grid, btn_x, btn_y, btn_w, btn_h, DF)
    draw_rect(grid, btn_x + 1, btn_y + 1, btn_w - 2, btn_h - 2, FG)
    draw_rect(grid, btn_x + 1, btn_y + 1, btn_w - 2, 4, LG)  # top highlight
    draw_rect_outline(grid, btn_x, btn_y, btn_w, btn_h, K)

    # Hammer icon on button
    for dy, row_data in enumerate([
        [_, ST, MG, ST, _],
        [_, _, BN, _, _],
        [_, _, BN, _, _],
        [_, _, BN, _, _],
    ]):
        for dx, c in enumerate(row_data):
            if c != _:
                set_pixel(grid, btn_x + btn_w // 2 - 2 + dx, btn_y + 4 + dy, c)

    # Bottom status bar
    draw_rect(grid, 2, H - 14, W - 4, 12, BD)
    draw_rect(grid, 2, H - 14, W - 4, 1, DT)

    # Material count area in status
    for i in range(3):
        sx = 8 + i * 30
        set_pixel(grid, sx, H - 10, GD)
        set_pixel(grid, sx + 1, H - 10, YL)
        set_pixel(grid, sx, H - 9, YL)
        set_pixel(grid, sx + 1, H - 9, DG)

    return grid


# ─── Progress Bar Spritesheet ────────────────────────────────────────────────

def gen_progress_bar():
    """80×10 progress bar, 8 frames (0%, ~14%, ~28%, ~42%, ~57%, ~71%, ~85%, 100%).
    Spritesheet: 640×10.
    """
    frames = []
    bar_w, bar_h = 80, 10

    for i in range(8):
        g = blank(bar_w, bar_h)
        # Background
        draw_rect(g, 0, 0, bar_w, bar_h, (17, 17, 17, 230))
        draw_rect_outline(g, 0, 0, bar_w, bar_h, DT)

        # Fill
        fill_w = int((i / 7) * (bar_w - 2))
        if fill_w > 0:
            # Color transitions from orange (start) to gold (end)
            if i <= 3:
                fill_color = FR
                highlight = YL
            elif i <= 5:
                fill_color = GD
                highlight = YL
            else:
                fill_color = LG  # complete = green
                highlight = BG

            draw_rect(g, 1, 1, fill_w, bar_h - 2, fill_color)
            draw_rect(g, 1, 1, fill_w, 3, highlight)

            # Shimmer at fill edge
            if fill_w > 2 and i < 7:
                set_pixel(g, fill_w, 2, PY)
                set_pixel(g, fill_w, 3, PY)

        frames.append(g)

    return hstack(frames)


# ─── VFX Spritesheets ────────────────────────────────────────────────────────

def gen_vfx_success():
    """Craft success — expanding golden star burst. 6 frames × 32×32 = 192×32."""
    frames = []
    S = 32
    cx, cy = S // 2, S // 2

    for i in range(6):
        g = blank(S, S)
        if i == 0:
            # Small center glow
            set_pixel(g, cx, cy, YL)
            set_pixel(g, cx - 1, cy, GD)
            set_pixel(g, cx + 1, cy, GD)
            set_pixel(g, cx, cy - 1, GD)
            set_pixel(g, cx, cy + 1, GD)
        elif i == 1:
            # Growing star
            for d in range(3):
                set_pixel(g, cx + d, cy, YL)
                set_pixel(g, cx - d, cy, YL)
                set_pixel(g, cx, cy + d, YL)
                set_pixel(g, cx, cy - d, YL)
            set_pixel(g, cx, cy, PY)
        elif i == 2:
            # Bright burst
            for d in range(5):
                set_pixel(g, cx + d, cy, PY)
                set_pixel(g, cx - d, cy, PY)
                set_pixel(g, cx, cy + d, PY)
                set_pixel(g, cx, cy - d, PY)
            # Diagonals
            for d in range(3):
                set_pixel(g, cx + d, cy + d, YL)
                set_pixel(g, cx - d, cy - d, YL)
                set_pixel(g, cx + d, cy - d, YL)
                set_pixel(g, cx - d, cy + d, YL)
            set_pixel(g, cx, cy, NW)
        elif i == 3:
            # Peak with particles
            for d in range(7):
                c = PY if d < 3 else YL if d < 5 else GD
                set_pixel(g, cx + d, cy, c)
                set_pixel(g, cx - d, cy, c)
                set_pixel(g, cx, cy + d, c)
                set_pixel(g, cx, cy - d, c)
            for d in range(4):
                set_pixel(g, cx + d, cy + d, GD)
                set_pixel(g, cx - d, cy - d, GD)
                set_pixel(g, cx + d, cy - d, GD)
                set_pixel(g, cx - d, cy + d, GD)
            # Sparkle particles
            set_pixel(g, cx + 8, cy - 3, PY)
            set_pixel(g, cx - 6, cy + 5, YL)
            set_pixel(g, cx + 4, cy + 7, GD)
            set_pixel(g, cx - 7, cy - 4, PY)
        elif i == 4:
            # Fading
            for d in range(5):
                c = (255, 224, 64, 180) if d < 3 else (232, 184, 0, 120)
                set_pixel(g, cx + d, cy, c)
                set_pixel(g, cx - d, cy, c)
                set_pixel(g, cx, cy + d, c)
                set_pixel(g, cx, cy - d, c)
            # Lingering sparkles
            set_pixel(g, cx + 6, cy - 5, (255, 248, 160, 150))
            set_pixel(g, cx - 5, cy + 6, (232, 184, 0, 100))
        elif i == 5:
            # Nearly gone — tiny residual sparkles
            set_pixel(g, cx, cy, (255, 224, 64, 100))
            set_pixel(g, cx + 3, cy - 2, (255, 248, 160, 80))
            set_pixel(g, cx - 2, cy + 3, (232, 184, 0, 60))

        frames.append(g)

    return hstack(frames)


def gen_vfx_failure():
    """Craft failure — red smoke puff. 6 frames × 32×32 = 192×32."""
    frames = []
    S = 32
    cx, cy = S // 2, S // 2

    for i in range(6):
        g = blank(S, S)
        if i == 0:
            # Small red flash
            set_pixel(g, cx, cy, BR)
            set_pixel(g, cx - 1, cy, ER)
            set_pixel(g, cx + 1, cy, ER)
        elif i == 1:
            # Red burst
            for d in range(3):
                set_pixel(g, cx + d, cy, BR)
                set_pixel(g, cx - d, cy, BR)
                set_pixel(g, cx, cy + d, ER)
                set_pixel(g, cx, cy - d, ER)
            set_pixel(g, cx, cy, FR)
        elif i == 2:
            # Smoke starting
            for d in range(4):
                set_pixel(g, cx + d, cy, (212, 32, 32, 200))
                set_pixel(g, cx - d, cy, (212, 32, 32, 200))
                set_pixel(g, cx, cy + d, (160, 16, 16, 180))
                set_pixel(g, cx, cy - d, (160, 16, 16, 180))
            # Smoke clouds
            set_pixel(g, cx - 2, cy - 2, (74, 74, 74, 150))
            set_pixel(g, cx + 2, cy - 2, (74, 74, 74, 150))
            set_pixel(g, cx + 3, cy + 1, (43, 43, 43, 120))
        elif i == 3:
            # More smoke, less red
            for d in range(2):
                set_pixel(g, cx + d, cy, (160, 16, 16, 150))
                set_pixel(g, cx - d, cy, (160, 16, 16, 150))
            # Smoke cloud expanding
            for dy in range(-3, 4):
                for dx in range(-4, 5):
                    dist = abs(dx) + abs(dy)
                    if 3 <= dist <= 5:
                        alpha = max(40, 160 - dist * 25)
                        set_pixel(g, cx + dx, cy + dy, (74, 74, 74, alpha))
        elif i == 4:
            # Mostly smoke
            for dy in range(-4, 5):
                for dx in range(-5, 6):
                    dist = abs(dx) + abs(dy)
                    if 3 <= dist <= 6:
                        alpha = max(30, 120 - dist * 18)
                        set_pixel(g, cx + dx, cy + dy, (43, 43, 43, alpha))
            # X mark
            for d in range(-2, 3):
                set_pixel(g, cx + d, cy + d, (160, 16, 16, 120))
                set_pixel(g, cx + d, cy - d, (160, 16, 16, 120))
        elif i == 5:
            # Fading wisps
            set_pixel(g, cx - 2, cy - 3, (43, 43, 43, 60))
            set_pixel(g, cx + 3, cy - 2, (74, 74, 74, 40))
            set_pixel(g, cx - 1, cy + 4, (43, 43, 43, 50))

        frames.append(g)

    return hstack(frames)


# ─── Generate Everything ─────────────────────────────────────────────────────

def main():
    print('=== PIX-66: Generating crafting system art assets ===\n')

    # --- Crafting station sprites ---
    print('Crafting station sprites (32×32, 4 frames each):')
    stations = {
        'station_anvil': gen_anvil,
        'station_alchemy_table': gen_alchemy_table,
        'station_workbench': gen_workbench,
    }
    for name, gen_fn in stations.items():
        pixels = gen_fn()
        write_png(os.path.join(ART_STATIONS, f'{name}.png'), pixels)
        write_png(os.path.join(OUT_DIR, f'{name}.png'), pixels)

    # --- Material icons ---
    print('\nCrafting material icons (16×16):')
    materials = {
        'icon_mat_iron_ore': gen_icon_iron_ore,
        'icon_mat_gold_ore': gen_icon_gold_ore,
        'icon_mat_crystal': gen_icon_crystal,
        'icon_mat_herb_green': lambda: gen_icon_herb(FG, LG, BG),
        'icon_mat_herb_red': lambda: gen_icon_herb(ER, BR, FR),
        'icon_mat_herb_blue': lambda: gen_icon_herb(DP, SB, PB),
        'icon_mat_gem_ruby': lambda: gen_icon_gem(ER, BR, DB),
        'icon_mat_gem_sapphire': lambda: gen_icon_gem(SB, PB, DP),
        'icon_mat_gem_emerald': lambda: gen_icon_gem(FG, LG, DF),
        'icon_mat_leather': gen_icon_leather,
        'icon_mat_wood': gen_icon_wood,
        'icon_mat_cloth': gen_icon_cloth,
        'icon_mat_bone': gen_icon_bone,
        'icon_mat_feather': gen_icon_feather,
        'icon_mat_venom': gen_icon_venom,
        'icon_mat_coal': gen_icon_coal,
        'icon_mat_moonstone': gen_icon_moonstone,
    }
    for name, gen_fn in materials.items():
        pixels = gen_fn()
        write_png(os.path.join(ART_ICONS, f'{name}.png'), pixels)
        write_png(os.path.join(OUT_DIR, f'{name}.png'), pixels)

    # --- Crafted item icons ---
    print('\nCrafted item icons (16×16):')
    crafted = {
        'icon_craft_iron_sword': gen_icon_iron_sword,
        'icon_craft_gold_ring': gen_icon_gold_ring,
        'icon_craft_leather_armor': gen_icon_leather_armor,
        'icon_craft_wooden_shield': gen_icon_wooden_shield,
        'icon_craft_health_potion': gen_icon_health_potion,
        'icon_craft_mana_potion': gen_icon_mana_potion,
        'icon_craft_fire_scroll': gen_icon_fire_scroll,
        'icon_craft_iron_helm': gen_icon_iron_helm,
        'icon_craft_bow': gen_icon_bow,
        'icon_craft_pickaxe': gen_icon_pickaxe,
        'icon_craft_staff': gen_icon_staff,
        'icon_craft_boots': gen_icon_boots,
    }
    for name, gen_fn in crafted.items():
        pixels = gen_fn()
        write_png(os.path.join(ART_ICONS, f'{name}.png'), pixels)
        write_png(os.path.join(OUT_DIR, f'{name}.png'), pixels)

    # --- UI Panel ---
    print('\nCrafting UI panel:')
    panel = gen_crafting_panel()
    write_png(os.path.join(ART_PANELS, 'ui_panel_crafting.png'), panel)
    write_png(os.path.join(OUT_DIR, 'ui_panel_crafting.png'), panel)

    # --- Progress bar ---
    print('\nCrafting progress bar (8 frames):')
    progress = gen_progress_bar()
    write_png(os.path.join(ART_UI, 'ui_craft_progress.png'), progress)
    write_png(os.path.join(OUT_DIR, 'ui_craft_progress.png'), progress)

    # --- VFX ---
    print('\nCraft result VFX:')
    success = gen_vfx_success()
    write_png(os.path.join(ART_VFX, 'vfx_craft_success.png'), success)
    write_png(os.path.join(OUT_DIR, 'vfx_craft_success.png'), success)

    failure = gen_vfx_failure()
    write_png(os.path.join(ART_VFX, 'vfx_craft_failure.png'), failure)
    write_png(os.path.join(OUT_DIR, 'vfx_craft_failure.png'), failure)

    print('\n=== Done! All crafting assets generated. ===')


if __name__ == '__main__':
    main()
