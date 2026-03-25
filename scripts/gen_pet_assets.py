#!/usr/bin/env python3
"""
Generate companion pet system art assets for PixelRealm (PIX-277).
Uses only Python stdlib (struct + zlib) — no PIL required.
Follows docs/ART-STYLE-GUIDE.md exactly.

Assets produced:
  Pet spritesheets (16×16 per frame, 10 frames = 160×16 each):
    pet_wolf.png          — Wolf companion (gray/blue)
    pet_hawk.png          — Hawk companion (brown/gold)
    pet_cat.png           — Cat companion (dark/green eyes)
    pet_dragon_whelp.png  — Dragon whelp companion (red/orange)
    pet_wisp.png          — Wisp companion (purple/glow)
    pet_golem.png         — Golem companion (stone/earth)

  Pet UI panel:
    ui_panel_pet.png          — 200×160 pet management panel
    ui_pet_happiness_bar.png  — 80×8 happiness meter (filled/empty)
    ui_pet_selection_grid.png — 120×80 pet selection grid (6 slots)

  Pet accessories (16×16 each, 4 per pet type = 24 total):
    acc_wolf_collar.png, acc_wolf_armor.png, acc_wolf_hat.png, acc_wolf_wings.png
    acc_hawk_collar.png, acc_hawk_armor.png, acc_hawk_hat.png, acc_hawk_wings.png
    acc_cat_collar.png, acc_cat_armor.png, acc_cat_hat.png, acc_cat_wings.png
    acc_dragon_whelp_collar.png, acc_dragon_whelp_armor.png, acc_dragon_whelp_hat.png, acc_dragon_whelp_wings.png
    acc_wisp_collar.png, acc_wisp_armor.png, acc_wisp_hat.png, acc_wisp_wings.png
    acc_golem_collar.png, acc_golem_armor.png, acc_golem_hat.png, acc_golem_wings.png

  Summon/dismiss VFX (32×32, 6 frames = 192×32):
    vfx_pet_summon.png   — sparkle summon animation
    vfx_pet_dismiss.png  — fade-out dismiss animation

  Pet interaction icons (16×16 each):
    icon_pet_feed.png
    icon_pet_play.png
    icon_pet_rename.png
    icon_pet_dismiss.png
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
OUT_PETS = os.path.join(OUT_DIR, 'pets')
ART_DIR = os.path.join(SCRIPT_DIR, '..', 'assets')
ART_PETS = os.path.join(ART_DIR, 'pets')
ART_UI = os.path.join(ART_DIR, 'ui', 'pets')
ART_VFX = os.path.join(ART_DIR, 'vfx')

for d in [OUT_PETS, ART_PETS, ART_UI, ART_VFX]:
    os.makedirs(d, exist_ok=True)

# ─── Palette (RGBA tuples) — master 32-color palette ─────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K  = (13,  13,  13,  255)   # shadow black / outline
DK = (43,  43,  43,  255)   # dark rock
ST = (74,  74,  74,  255)   # stone gray
MG = (110, 110, 110, 255)   # mid gray
LS = (150, 150, 150, 255)   # light stone
PG = (200, 200, 200, 255)   # pale gray
NW = (240, 240, 240, 255)   # near white

# Warm earth
BD = (59,  32,  16,  255)   # deep soil
BN = (107, 58,  31,  255)   # rich earth
DT = (139, 92,  42,  255)   # dirt / wood
SN = (184, 132, 63,  255)   # sand / light wood
DS = (212, 168, 90,  255)   # desert gold
PS = (232, 208, 138, 255)   # pale sand

# Greens
DF = (26,  58,  26,  255)   # deep forest
FG = (45,  110, 45,  255)   # forest green
LG = (76,  155, 76,  255)   # leaf green
BG = (120, 200, 120, 255)   # bright grass

# Cyan / blue
OC = (10,  26,  58,  255)   # deep ocean
DP = (26,  74,  138, 255)   # ocean blue
SB = (42,  122, 192, 255)   # sky blue
PB = (80,  168, 232, 255)   # player blue
HB = (144, 208, 248, 255)   # ice / highlight
IW = (200, 240, 255, 255)   # shimmer

# Red / enemy / fire
DB = (90,  10,  10,  255)   # deep blood
ER = (160, 16,  16,  255)   # enemy red
BR = (212, 32,  32,  255)   # bright red
FR = (240, 96,  32,  255)   # fire orange
EM = (248, 160, 96,  255)   # ember

# Yellow / gold
DG = (168, 112, 0,   255)   # dark gold
GD = (232, 184, 0,   255)   # gold
YL = (255, 224, 64,  255)   # bright yellow
PY = (255, 248, 160, 255)   # pale highlight

# Purple / magic
PM = (26,  10,  58,  255)   # deep magic
MP = (90,  32,  160, 255)   # magic purple
MV = (144, 80,  224, 255)   # mana violet
SG = (208, 144, 255, 255)   # spell glow


# ─── PNG writer ──────────────────────────────────────────────────────────────

def _make_chunk(chunk_type: bytes, data: bytes) -> bytes:
    payload = chunk_type + data
    crc = zlib.crc32(payload) & 0xFFFFFFFF
    return struct.pack('>I', len(data)) + payload + struct.pack('>I', crc)


def write_png(path: str, pixels: list) -> None:
    height = len(pixels)
    width = len(pixels[0])
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
    return [[fill] * w for _ in range(h)]


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


def mirror_h(src):
    return [row[::-1] for row in src]


def overlay(dst, src, x_off, y_off):
    for r in range(len(src)):
        for c in range(len(src[0])):
            if src[r][c][3] > 0:
                dr, dc = r + y_off, c + x_off
                if 0 <= dr < len(dst) and 0 <= dc < len(dst[0]):
                    dst[dr][dc] = src[r][c]


def dual_write(art_path, public_subpath, pixels):
    write_png(art_path, pixels)
    pub_path = os.path.join(OUT_PETS, public_subpath)
    os.makedirs(os.path.dirname(pub_path), exist_ok=True)
    write_png(pub_path, pixels)


# ═════════════════════════════════════════════════════════════════════════════
# 1. PET SPRITESHEETS
#    Each pet: 16×16 per frame, 10 frames horizontal = 160×16
#    Layout: idle(2) + walk(4) + attack(4)
# ═════════════════════════════════════════════════════════════════════════════

def make_wolf_frames():
    """Wolf companion — gray body, blue eyes, loyal canine silhouette."""
    body = MG   # mid gray
    dark = DK   # dark shadow
    eye = PB    # player blue (friendly)
    nose = K    # black nose

    # ── idle frame 0 ──
    f0 = blank(16, 16)
    # body mass (crouching wolf, facing right)
    rect(f0, 4, 8, 8, 4, body)      # torso
    rect(f0, 5, 9, 6, 2, dark)      # belly shadow
    # head
    rect(f0, 10, 5, 4, 4, body)     # head block
    dot(f0, 13, 5, dark)            # ear tip right
    dot(f0, 11, 5, dark)            # ear tip left
    dot(f0, 12, 7, eye)             # eye
    dot(f0, 13, 8, nose)            # nose
    # legs
    rect(f0, 5, 12, 2, 2, body)    # back legs
    rect(f0, 9, 12, 2, 2, body)    # front legs
    # tail
    dot(f0, 3, 7, body)
    dot(f0, 2, 6, body)
    # paws
    dot(f0, 5, 14, dark)
    dot(f0, 6, 14, dark)
    dot(f0, 9, 14, dark)
    dot(f0, 10, 14, dark)

    # ── idle frame 1 (breathing: 1px body shift) ──
    f1 = copy_frame(f0)
    dot(f1, 2, 6, _)
    dot(f1, 2, 7, body)  # tail wag down

    # ── walk frames (4) ──
    w0 = copy_frame(f0)
    # back legs forward
    rect(w0, 5, 12, 2, 2, _)
    rect(w0, 6, 12, 2, 2, body)
    dot(w0, 6, 14, dark)
    dot(w0, 7, 14, dark)

    w1 = copy_frame(f0)
    # front legs forward
    rect(w1, 9, 12, 2, 2, _)
    rect(w1, 10, 12, 2, 2, body)
    dot(w1, 10, 14, dark)
    dot(w1, 11, 14, dark)

    w2 = copy_frame(f0)
    # back legs back
    rect(w2, 5, 12, 2, 2, _)
    rect(w2, 4, 12, 2, 2, body)
    dot(w2, 4, 14, dark)
    dot(w2, 5, 14, dark)

    w3 = copy_frame(f0)
    # front legs back
    rect(w3, 9, 12, 2, 2, _)
    rect(w3, 8, 12, 2, 2, body)
    dot(w3, 8, 14, dark)
    dot(w3, 9, 14, dark)

    # ── attack frames (4) — lunge forward ──
    a0 = copy_frame(f0)
    # wind-up: crouch lower
    rect(a0, 4, 9, 8, 4, body)
    rect(a0, 5, 10, 6, 2, dark)

    a1 = copy_frame(f0)
    # lunge: body shifts right 2px
    rect(a1, 4, 8, 8, 4, _)
    rect(a1, 6, 7, 8, 4, body)
    rect(a1, 7, 8, 6, 2, dark)
    # head forward
    rect(a1, 12, 4, 4, 4, body)
    dot(a1, 14, 6, eye)
    dot(a1, 15, 7, nose)

    a2 = copy_frame(a1)
    # bite: mouth open
    dot(a2, 15, 7, _)
    dot(a2, 15, 7, NW)   # teeth flash
    dot(a2, 15, 8, NW)

    a3 = copy_frame(f0)
    # recover back to idle

    return [f0, f1, w0, w1, w2, w3, a0, a1, a2, a3]


def make_hawk_frames():
    """Hawk companion — brown body, gold accents, flying bird silhouette."""
    body = BN    # rich earth/brown
    wing = DT    # dirt/wood brown
    beak = DS    # desert gold
    eye = GD     # gold eye
    talon = BD   # deep soil

    # ── idle frame 0 (perched) ──
    f0 = blank(16, 16)
    # body
    rect(f0, 6, 7, 4, 5, body)      # torso
    rect(f0, 7, 8, 2, 3, wing)      # chest highlight
    # head
    rect(f0, 6, 4, 4, 3, body)      # head
    dot(f0, 9, 5, eye)              # eye
    dot(f0, 10, 6, beak)            # beak
    # wings folded
    dot(f0, 5, 8, wing)
    dot(f0, 5, 9, wing)
    dot(f0, 10, 8, wing)
    dot(f0, 10, 9, wing)
    # tail feathers
    dot(f0, 7, 12, wing)
    dot(f0, 8, 12, wing)
    dot(f0, 7, 13, body)
    # talons
    dot(f0, 6, 12, talon)
    dot(f0, 9, 12, talon)

    # ── idle frame 1 ──
    f1 = copy_frame(f0)
    dot(f1, 7, 13, _)
    dot(f1, 8, 13, body)  # tail feather shift

    # ── walk/fly frames (4) — wings up/mid/down/mid ──
    w0 = copy_frame(f0)
    # wings up
    dot(w0, 5, 8, _); dot(w0, 5, 9, _)
    dot(w0, 10, 8, _); dot(w0, 10, 9, _)
    dot(w0, 4, 5, wing); dot(w0, 3, 4, wing)   # left wing up
    dot(w0, 11, 5, wing); dot(w0, 12, 4, wing)  # right wing up

    w1 = copy_frame(f0)
    # wings mid-up
    dot(w1, 5, 8, _); dot(w1, 5, 9, _)
    dot(w1, 10, 8, _); dot(w1, 10, 9, _)
    dot(w1, 4, 6, wing); dot(w1, 3, 5, wing)
    dot(w1, 11, 6, wing); dot(w1, 12, 5, wing)

    w2 = copy_frame(f0)
    # wings down
    dot(w2, 5, 8, _); dot(w2, 5, 9, _)
    dot(w2, 10, 8, _); dot(w2, 10, 9, _)
    dot(w2, 4, 9, wing); dot(w2, 3, 10, wing)
    dot(w2, 11, 9, wing); dot(w2, 12, 10, wing)

    w3 = copy_frame(w1)  # return to mid

    # ── attack frames (4) — dive attack ──
    a0 = copy_frame(w0)  # wings up (wind-up)

    a1 = blank(16, 16)
    # diving pose — body angled down-right
    rect(a1, 8, 5, 4, 3, body)
    dot(a1, 11, 5, eye)
    dot(a1, 12, 6, beak)
    dot(a1, 7, 4, wing); dot(a1, 6, 3, wing)
    dot(a1, 7, 8, wing); dot(a1, 6, 9, wing)
    dot(a1, 9, 8, body)  # tail
    # talon strike
    dot(a1, 12, 7, talon)
    dot(a1, 13, 8, talon)

    a2 = copy_frame(a1)
    # impact flash
    dot(a2, 13, 8, NW)
    dot(a2, 14, 9, NW)

    a3 = copy_frame(f0)  # recover

    return [f0, f1, w0, w1, w2, w3, a0, a1, a2, a3]


def make_cat_frames():
    """Cat companion — dark body, green eyes, agile feline silhouette."""
    body = DK    # dark rock (black cat)
    belly = ST   # stone gray underbelly
    eye = LG     # leaf green
    nose = ER    # tiny red nose
    paw = MG     # mid gray paws

    # ── idle frame 0 (sitting) ──
    f0 = blank(16, 16)
    # body (sitting cat)
    rect(f0, 6, 8, 5, 4, body)      # torso
    rect(f0, 7, 9, 3, 2, belly)     # belly
    # head
    rect(f0, 6, 4, 5, 4, body)      # head
    dot(f0, 6, 4, body)             # left ear
    dot(f0, 10, 4, body)            # right ear
    dot(f0, 7, 6, eye)              # left eye
    dot(f0, 9, 6, eye)              # right eye
    dot(f0, 8, 7, nose)             # nose
    # front paws tucked
    dot(f0, 6, 12, paw)
    dot(f0, 10, 12, paw)
    # tail curling up right
    dot(f0, 11, 10, body)
    dot(f0, 12, 9, body)
    dot(f0, 12, 8, body)

    # ── idle frame 1 (tail flick) ──
    f1 = copy_frame(f0)
    dot(f1, 12, 8, _)
    dot(f1, 13, 8, body)   # tail tip moves right

    # ── walk frames (4) ──
    w0 = blank(16, 16)
    # walking pose — body horizontal
    rect(w0, 4, 8, 8, 3, body)      # torso
    rect(w0, 5, 9, 6, 1, belly)     # belly
    # head
    rect(w0, 10, 5, 4, 4, body)
    dot(w0, 10, 5, body)            # ear
    dot(w0, 13, 5, body)            # ear
    dot(w0, 11, 7, eye)
    dot(w0, 12, 7, eye)             # second eye visible in profile
    dot(w0, 13, 8, nose)
    # legs — stride 0
    rect(w0, 5, 11, 1, 3, body)
    rect(w0, 7, 11, 1, 3, body)
    rect(w0, 9, 11, 1, 3, body)
    rect(w0, 11, 11, 1, 3, body)
    dot(w0, 5, 13, paw); dot(w0, 7, 13, paw)
    dot(w0, 9, 13, paw); dot(w0, 11, 13, paw)
    # tail
    dot(w0, 3, 7, body)
    dot(w0, 2, 6, body)

    w1 = copy_frame(w0)
    # legs alternate
    rect(w1, 5, 11, 1, 3, _); rect(w1, 9, 11, 1, 3, _)
    rect(w1, 6, 11, 1, 3, body); rect(w1, 10, 11, 1, 3, body)
    dot(w1, 6, 13, paw); dot(w1, 10, 13, paw)

    w2 = copy_frame(w0)
    rect(w2, 7, 11, 1, 3, _); rect(w2, 11, 11, 1, 3, _)
    rect(w2, 8, 11, 1, 3, body); rect(w2, 10, 11, 1, 3, body)
    dot(w2, 8, 13, paw); dot(w2, 10, 13, paw)

    w3 = copy_frame(w1)

    # ── attack frames (4) — pounce ──
    a0 = copy_frame(w0)
    # crouch
    rect(a0, 4, 9, 8, 3, body)

    a1 = blank(16, 16)
    # leap — body in air, diagonal
    rect(a1, 6, 5, 7, 3, body)
    rect(a1, 7, 6, 5, 1, belly)
    rect(a1, 11, 2, 4, 4, body)
    dot(a1, 12, 4, eye); dot(a1, 13, 4, eye)
    dot(a1, 14, 5, nose)
    # extended claws
    dot(a1, 14, 6, NW)
    dot(a1, 13, 7, NW)
    # tail streaming behind
    dot(a1, 5, 4, body); dot(a1, 4, 3, body)

    a2 = copy_frame(a1)
    # claw swipe flash
    dot(a2, 14, 6, PY)
    dot(a2, 15, 5, PY)

    a3 = copy_frame(f0)  # back to sitting

    return [f0, f1, w0, w1, w2, w3, a0, a1, a2, a3]


def make_dragon_whelp_frames():
    """Dragon whelp — red/orange baby dragon, small wings, fire breath attack."""
    body = ER    # enemy red (but friendly — small and cute overrides threat)
    belly = FR   # fire orange underbelly
    wing = BR    # bright red wings
    eye = YL     # bright yellow
    horn = DG    # dark gold horns

    # ── idle frame 0 ──
    f0 = blank(16, 16)
    # body
    rect(f0, 5, 8, 6, 4, body)      # torso
    rect(f0, 6, 9, 4, 2, belly)     # belly highlight
    # head
    rect(f0, 8, 4, 5, 4, body)
    dot(f0, 9, 3, horn)             # left horn
    dot(f0, 11, 3, horn)            # right horn
    dot(f0, 10, 6, eye)             # eye
    dot(f0, 12, 7, K)               # nostril
    # small wings
    dot(f0, 5, 7, wing)
    dot(f0, 4, 6, wing)
    dot(f0, 4, 7, wing)
    # legs
    rect(f0, 6, 12, 2, 2, body)
    rect(f0, 9, 12, 2, 2, body)
    dot(f0, 6, 14, horn); dot(f0, 7, 14, horn)
    dot(f0, 9, 14, horn); dot(f0, 10, 14, horn)
    # tail
    dot(f0, 4, 10, body)
    dot(f0, 3, 9, body)
    dot(f0, 2, 9, FR)  # tail tip glow

    # ── idle frame 1 ──
    f1 = copy_frame(f0)
    dot(f1, 2, 9, _)
    dot(f1, 2, 10, FR)  # tail sway

    # ── walk frames ──
    w0 = copy_frame(f0)
    rect(w0, 6, 12, 2, 2, _)
    rect(w0, 7, 12, 2, 2, body)
    dot(w0, 7, 14, horn); dot(w0, 8, 14, horn)

    w1 = copy_frame(f0)
    rect(w1, 9, 12, 2, 2, _)
    rect(w1, 10, 12, 2, 2, body)
    dot(w1, 10, 14, horn); dot(w1, 11, 14, horn)

    w2 = copy_frame(f0)
    rect(w2, 6, 12, 2, 2, _)
    rect(w2, 5, 12, 2, 2, body)
    dot(w2, 5, 14, horn); dot(w2, 6, 14, horn)

    w3 = copy_frame(f0)
    rect(w3, 9, 12, 2, 2, _)
    rect(w3, 8, 12, 2, 2, body)
    dot(w3, 8, 14, horn); dot(w3, 9, 14, horn)

    # ── attack frames — fire breath ──
    a0 = copy_frame(f0)
    # inhale — head pulls back
    rect(a0, 8, 4, 5, 4, _)
    rect(a0, 7, 4, 5, 4, body)
    dot(a0, 8, 3, horn); dot(a0, 10, 3, horn)
    dot(a0, 9, 6, eye)

    a1 = copy_frame(f0)
    # fire breath! Small flame
    dot(a1, 13, 6, FR)
    dot(a1, 14, 5, YL)
    dot(a1, 14, 7, YL)
    dot(a1, 15, 6, EM)

    a2 = copy_frame(f0)
    # bigger flame
    dot(a2, 13, 5, FR); dot(a2, 13, 6, FR); dot(a2, 13, 7, FR)
    dot(a2, 14, 5, YL); dot(a2, 14, 6, EM); dot(a2, 14, 7, YL)
    dot(a2, 15, 6, PY)

    a3 = copy_frame(f0)  # recover, small smoke
    dot(a3, 13, 6, LS)   # smoke puff

    return [f0, f1, w0, w1, w2, w3, a0, a1, a2, a3]


def make_wisp_frames():
    """Wisp companion — floating magical orb, purple/white glow, ethereal."""
    core = MV    # mana violet
    glow = SG    # spell glow
    bright = NW  # near white center
    dim = MP     # magic purple outer
    spark = PY   # pale highlight sparkle

    # ── idle frame 0 ──
    f0 = blank(16, 16)
    # outer glow (very faint)
    dot(f0, 7, 5, dim); dot(f0, 8, 5, dim)
    dot(f0, 6, 6, dim); dot(f0, 9, 6, dim)
    dot(f0, 6, 9, dim); dot(f0, 9, 9, dim)
    dot(f0, 7, 10, dim); dot(f0, 8, 10, dim)
    # core
    rect(f0, 7, 6, 2, 2, core)
    dot(f0, 7, 8, glow); dot(f0, 8, 8, glow)
    dot(f0, 7, 9, glow); dot(f0, 8, 9, glow)
    # bright center
    dot(f0, 7, 7, bright)
    dot(f0, 8, 7, bright)
    # trailing sparkles below
    dot(f0, 7, 11, glow)
    dot(f0, 8, 12, dim)

    # ── idle frame 1 (bob up 1px) ──
    f1 = blank(16, 16)
    dot(f1, 7, 4, dim); dot(f1, 8, 4, dim)
    dot(f1, 6, 5, dim); dot(f1, 9, 5, dim)
    dot(f1, 6, 8, dim); dot(f1, 9, 8, dim)
    dot(f1, 7, 9, dim); dot(f1, 8, 9, dim)
    rect(f1, 7, 5, 2, 2, core)
    dot(f1, 7, 7, glow); dot(f1, 8, 7, glow)
    dot(f1, 7, 8, glow); dot(f1, 8, 8, glow)
    dot(f1, 7, 6, bright); dot(f1, 8, 6, bright)
    dot(f1, 8, 10, glow)
    dot(f1, 7, 11, dim)

    # ── walk frames (4) — floating drift with trailing particles ──
    w0 = copy_frame(f0)
    dot(w0, 6, 12, spark)  # sparkle trail

    w1 = copy_frame(f1)
    dot(w1, 9, 11, spark)

    w2 = copy_frame(f0)
    dot(w2, 5, 11, spark)
    dot(w2, 9, 13, dim)

    w3 = copy_frame(f1)
    dot(w3, 10, 10, spark)

    # ── attack frames — magic pulse ──
    a0 = copy_frame(f0)
    # charge: glow intensifies
    dot(a0, 6, 6, core); dot(a0, 9, 6, core)
    dot(a0, 6, 9, core); dot(a0, 9, 9, core)

    a1 = blank(16, 16)
    # pulse expanding
    rect(a1, 5, 4, 6, 8, dim)
    rect(a1, 6, 5, 4, 6, core)
    rect(a1, 7, 6, 2, 4, glow)
    dot(a1, 7, 7, bright); dot(a1, 8, 7, bright)

    a2 = blank(16, 16)
    # max pulse — ring of sparkles
    rect(a2, 6, 5, 4, 6, core)
    rect(a2, 7, 6, 2, 4, bright)
    # sparkle ring
    dot(a2, 4, 7, spark); dot(a2, 11, 7, spark)
    dot(a2, 7, 3, spark); dot(a2, 8, 12, spark)
    dot(a2, 5, 4, spark); dot(a2, 10, 10, spark)
    dot(a2, 10, 4, spark); dot(a2, 5, 10, spark)

    a3 = copy_frame(f0)  # settle back

    return [f0, f1, w0, w1, w2, w3, a0, a1, a2, a3]


def make_golem_frames():
    """Golem companion — stone/earth body, sturdy blocky silhouette, slow but powerful."""
    body = ST    # stone gray
    dark = DK    # shadow
    light = LS   # light stone highlights
    eye = PB     # player blue (friendly glow)
    crack = BN   # earth-toned cracks
    moss = DF    # moss accent

    # ── idle frame 0 ──
    f0 = blank(16, 16)
    # body (blocky)
    rect(f0, 5, 6, 6, 6, body)      # torso
    rect(f0, 6, 7, 4, 4, dark)      # inner shadow
    dot(f0, 6, 7, light)            # stone highlight
    dot(f0, 9, 10, light)
    # cracks
    dot(f0, 7, 9, crack)
    dot(f0, 8, 8, crack)
    # head
    rect(f0, 6, 3, 4, 3, body)
    dot(f0, 7, 4, eye)              # left eye glow
    dot(f0, 9, 4, eye)              # right eye glow
    # moss on shoulder
    dot(f0, 5, 6, moss)
    dot(f0, 10, 6, moss)
    # arms
    rect(f0, 3, 7, 2, 4, body)      # left arm
    rect(f0, 11, 7, 2, 4, body)     # right arm
    dot(f0, 3, 10, dark); dot(f0, 4, 10, dark)
    dot(f0, 11, 10, dark); dot(f0, 12, 10, dark)
    # legs
    rect(f0, 5, 12, 3, 2, body)
    rect(f0, 8, 12, 3, 2, body)
    dot(f0, 5, 14, dark); dot(f0, 7, 14, dark)
    dot(f0, 8, 14, dark); dot(f0, 10, 14, dark)

    # ── idle frame 1 ──
    f1 = copy_frame(f0)
    # subtle eye pulse
    dot(f1, 7, 4, HB)   # brighter glow
    dot(f1, 9, 4, HB)

    # ── walk frames (4) — heavy stomping ──
    w0 = copy_frame(f0)
    # left leg forward
    rect(w0, 5, 12, 3, 2, _)
    rect(w0, 6, 12, 3, 2, body)
    dot(w0, 6, 14, dark); dot(w0, 8, 14, dark)

    w1 = copy_frame(f0)
    # right leg forward
    rect(w1, 8, 12, 3, 2, _)
    rect(w1, 9, 12, 3, 2, body)
    dot(w1, 9, 14, dark); dot(w1, 11, 14, dark)

    w2 = copy_frame(f0)
    # left leg back
    rect(w2, 5, 12, 3, 2, _)
    rect(w2, 4, 12, 3, 2, body)
    dot(w2, 4, 14, dark); dot(w2, 6, 14, dark)

    w3 = copy_frame(f0)
    # right leg back
    rect(w3, 8, 12, 3, 2, _)
    rect(w3, 7, 12, 3, 2, body)
    dot(w3, 7, 14, dark); dot(w3, 9, 14, dark)

    # ── attack frames — ground pound ──
    a0 = copy_frame(f0)
    # raise arms
    rect(a0, 3, 7, 2, 4, _); rect(a0, 11, 7, 2, 4, _)
    rect(a0, 3, 4, 2, 3, body); rect(a0, 11, 4, 2, 3, body)

    a1 = copy_frame(f0)
    # slam down — arms low, impact lines
    rect(a1, 3, 7, 2, 4, _); rect(a1, 11, 7, 2, 4, _)
    rect(a1, 2, 10, 3, 2, body); rect(a1, 11, 10, 3, 2, body)
    # impact dust
    dot(a1, 1, 13, SN); dot(a1, 14, 13, SN)
    dot(a1, 0, 14, DS); dot(a1, 15, 14, DS)

    a2 = copy_frame(a1)
    # more dust / impact
    dot(a2, 2, 14, SN); dot(a2, 13, 14, SN)
    dot(a2, 1, 15, PS); dot(a2, 14, 15, PS)

    a3 = copy_frame(f0)  # recover

    return [f0, f1, w0, w1, w2, w3, a0, a1, a2, a3]


def generate_pet_spritesheets():
    """Generate all 6 pet spritesheets as horizontal strips."""
    pets = {
        'wolf':         make_wolf_frames,
        'hawk':         make_hawk_frames,
        'cat':          make_cat_frames,
        'dragon_whelp': make_dragon_whelp_frames,
        'wisp':         make_wisp_frames,
        'golem':        make_golem_frames,
    }
    print('\n=== Pet Spritesheets (160×16 each) ===')
    for name, make_fn in pets.items():
        frames = make_fn()
        sheet = hstack(frames)
        fname = f'pet_{name}.png'
        dual_write(
            os.path.join(ART_PETS, fname),
            fname,
            sheet,
        )


# ═════════════════════════════════════════════════════════════════════════════
# 2. PET UI PANEL
# ═════════════════════════════════════════════════════════════════════════════

def generate_pet_ui():
    """Generate pet management UI assets."""
    print('\n=== Pet UI Assets ===')

    # ── Main pet panel (200×160) ──
    panel = blank(200, 160, PM)
    # dark background fill
    rect(panel, 0, 0, 200, 160, PM)
    # border
    outline(panel, 0, 0, 200, 160, MP)
    outline(panel, 1, 1, 198, 158, MV)
    # title bar area
    rect(panel, 2, 2, 196, 14, OC)
    # "COMPANION" text placeholder — decorative dots
    for i in range(10):
        dot(panel, 80 + i * 4, 7, SG)
        dot(panel, 80 + i * 4, 9, MV)
    # pet portrait area (left side)
    outline(panel, 6, 20, 52, 52, MV)
    rect(panel, 7, 21, 50, 50, OC)
    # pet silhouette placeholder in portrait
    rect(panel, 22, 32, 20, 20, MP)
    rect(panel, 26, 28, 12, 8, MP)
    # stats area (right side)
    outline(panel, 64, 20, 130, 52, MV)
    rect(panel, 65, 21, 128, 50, OC)
    # stat labels (decorative bars)
    for i in range(4):
        y = 26 + i * 12
        rect(panel, 70, y, 30, 6, ST)        # label
        rect(panel, 104, y, 80, 6, DK)       # bar bg
        rect(panel, 104, y, 50, 6, LG)       # bar fill (health example)
    # happiness bar (below stats)
    rect(panel, 70, 26 + 0 * 12, 30, 6, ST)
    rect(panel, 104, 26 + 0 * 12, 80, 6, DK)
    rect(panel, 104, 26 + 0 * 12, 60, 6, PB)   # happiness (blue)
    # feeding interface area (bottom left)
    outline(panel, 6, 78, 90, 74, MV)
    rect(panel, 7, 79, 88, 72, OC)
    # food slot grid (3×3)
    for row in range(3):
        for col in range(3):
            x = 12 + col * 26
            y = 86 + row * 22
            outline(panel, x, y, 22, 18, ST)
            rect(panel, x + 1, y + 1, 20, 16, DK)
    # action buttons (bottom right)
    outline(panel, 102, 78, 92, 74, MV)
    rect(panel, 103, 79, 90, 72, OC)
    # 4 action button slots
    for i in range(4):
        bx = 110 + (i % 2) * 40
        by = 86 + (i // 2) * 32
        outline(panel, bx, by, 32, 24, SG)
        rect(panel, bx + 1, by + 1, 30, 22, MP)
    # corner decorations
    dot(panel, 2, 2, SG); dot(panel, 197, 2, SG)
    dot(panel, 2, 157, SG); dot(panel, 197, 157, SG)

    dual_write(
        os.path.join(ART_UI, 'ui_panel_pet.png'),
        'ui_panel_pet.png',
        panel,
    )

    # ── Happiness bar (80×8) ──
    bar = blank(80, 8, _)
    outline(bar, 0, 0, 80, 8, K)
    rect(bar, 1, 1, 78, 6, DK)
    # gradient fill — blue to green (happy)
    for x in range(60):
        t = x / 60.0
        if t < 0.5:
            c = PB
        else:
            c = LG
        vline(bar, 1 + x, 1, 6, c)
    # tick marks
    for x in [20, 40, 60]:
        dot(bar, x, 0, NW)
        dot(bar, x, 7, NW)

    dual_write(
        os.path.join(ART_UI, 'ui_pet_happiness_bar.png'),
        'ui_pet_happiness_bar.png',
        bar,
    )

    # ── Pet selection grid (120×80) — 6 slots (3×2) ──
    grid = blank(120, 80, PM)
    outline(grid, 0, 0, 120, 80, MP)
    rect(grid, 1, 1, 118, 78, OC)
    for row in range(2):
        for col in range(3):
            sx = 6 + col * 38
            sy = 6 + row * 36
            outline(grid, sx, sy, 34, 32, MV)
            rect(grid, sx + 1, sy + 1, 32, 30, DK)
            # pet silhouette placeholder
            rect(grid, sx + 9, sy + 7, 16, 16, ST)
    # selected indicator on first slot
    outline(grid, 6, 6, 34, 32, SG)
    outline(grid, 5, 5, 36, 34, GD)

    dual_write(
        os.path.join(ART_UI, 'ui_pet_selection_grid.png'),
        'ui_pet_selection_grid.png',
        grid,
    )


# ═════════════════════════════════════════════════════════════════════════════
# 3. PET ACCESSORIES (16×16 each, overlay sprites)
# ═════════════════════════════════════════════════════════════════════════════

def make_collar(accent):
    """Generic collar overlay — 16×16, positioned at neck area."""
    f = blank(16, 16)
    hline(f, 5, 8, 6, accent)
    dot(f, 8, 9, GD)  # buckle/gem
    return f


def make_armor(accent):
    """Small armor piece overlay — covers torso area."""
    f = blank(16, 16)
    rect(f, 5, 7, 6, 3, accent)
    outline(f, 5, 7, 6, 3, K)
    dot(f, 7, 8, GD)  # armor gem
    dot(f, 8, 8, LS)  # highlight
    return f


def make_hat(accent):
    """Tiny hat overlay — sits on head."""
    f = blank(16, 16)
    rect(f, 7, 2, 4, 2, accent)     # hat crown
    rect(f, 6, 4, 6, 1, accent)     # hat brim
    outline(f, 7, 2, 4, 2, K)
    dot(f, 9, 2, GD)               # hat decoration
    return f


def make_wings(accent):
    """Small decorative wing overlay."""
    f = blank(16, 16)
    # left wing
    dot(f, 4, 6, accent)
    dot(f, 3, 5, accent)
    dot(f, 2, 4, accent)
    dot(f, 3, 6, accent)
    # right wing
    dot(f, 11, 6, accent)
    dot(f, 12, 5, accent)
    dot(f, 13, 4, accent)
    dot(f, 12, 6, accent)
    # outline
    dot(f, 1, 3, K); dot(f, 14, 3, K)
    return f


def generate_pet_accessories():
    """Generate 4 accessories per pet type (24 total)."""
    print('\n=== Pet Accessories (16×16 each) ===')

    # Each pet type gets a themed color for its accessories
    pet_accents = {
        'wolf':         (PB, SB, HB),      # blue tones
        'hawk':         (DS, SN, DG),       # gold/brown tones
        'cat':          (LG, FG, BG),       # green tones
        'dragon_whelp': (FR, EM, BR),       # fire tones
        'wisp':         (MV, SG, MP),       # purple tones
        'golem':        (LS, ST, MG),       # stone tones
    }
    accessory_fns = {
        'collar': make_collar,
        'armor':  make_armor,
        'hat':    make_hat,
        'wings':  make_wings,
    }

    for pet_name, (c1, c2, c3) in pet_accents.items():
        colors = {'collar': c1, 'armor': c2, 'hat': c1, 'wings': c3}
        for acc_name, fn in accessory_fns.items():
            pixels = fn(colors[acc_name])
            fname = f'acc_{pet_name}_{acc_name}.png'
            dual_write(
                os.path.join(ART_PETS, fname),
                fname,
                pixels,
            )


# ═════════════════════════════════════════════════════════════════════════════
# 4. SUMMON / DISMISS VFX (32×32, 6 frames = 192×32)
# ═════════════════════════════════════════════════════════════════════════════

def generate_summon_vfx():
    """Sparkle summon animation — magic circle appears and pet materializes."""
    print('\n=== Summon VFX (192×32) ===')
    frames = []

    for i in range(6):
        f = blank(32, 32)
        cx, cy = 16, 16
        # magic circle grows over frames
        radius = 2 + i * 2
        # draw sparkle points on circle (8 points)
        import math
        for j in range(8):
            angle = j * math.pi / 4 + i * 0.3
            x = int(cx + radius * math.cos(angle))
            y = int(cy + radius * math.sin(angle))
            if 0 <= x < 32 and 0 <= y < 32:
                dot(f, x, y, SG)
                # extra bright for main sparkle points
                if j % 2 == 0:
                    if 0 <= x + 1 < 32:
                        dot(f, x + 1, y, MV)
                    if 0 <= y + 1 < 32:
                        dot(f, x, y + 1, MV)

        # central glow grows
        glow_r = min(i, 3)
        if glow_r > 0:
            rect(f, cx - glow_r, cy - glow_r, glow_r * 2, glow_r * 2, MP)
            if glow_r > 1:
                rect(f, cx - glow_r + 1, cy - glow_r + 1,
                     glow_r * 2 - 2, glow_r * 2 - 2, MV)
        # bright center flash on frames 3-5
        if i >= 3:
            dot(f, cx, cy, NW)
            dot(f, cx - 1, cy, SG)
            dot(f, cx + 1, cy, SG)
            dot(f, cx, cy - 1, SG)
            dot(f, cx, cy + 1, SG)
        # vertical sparkle lines (summoning pillar) on later frames
        if i >= 4:
            for sy in range(cy - 8, cy + 8):
                if 0 <= sy < 32 and (sy + i) % 3 == 0:
                    dot(f, cx, sy, PY)

        frames.append(f)

    sheet = hstack(frames)
    dual_write(
        os.path.join(ART_VFX, 'vfx_pet_summon.png'),
        'vfx_pet_summon.png',
        sheet,
    )


def generate_dismiss_vfx():
    """Fade-out dismiss animation — pet dissolves into sparkles."""
    print('\n=== Dismiss VFX (192×32) ===')
    frames = []

    for i in range(6):
        f = blank(32, 32)
        cx, cy = 16, 16
        # Pet silhouette fading — represented as shrinking block
        size = max(0, 8 - i * 2)
        if size > 0:
            # fade color from solid to dim
            fade_colors = [ST, MG, LS, PG, NW, _]
            c = fade_colors[min(i, 5)]
            rect(f, cx - size, cy - size, size * 2, size * 2, c)

        # Dispersing sparkles — more as frames progress
        import math
        n_sparkles = i * 4 + 2
        for j in range(n_sparkles):
            angle = j * 2.4 + i * 0.5
            dist = 2 + i * 2 + (j % 3)
            x = int(cx + dist * math.cos(angle))
            y = int(cy + dist * math.sin(angle))
            if 0 <= x < 32 and 0 <= y < 32:
                sparkle_colors = [SG, MV, MP, PY, HB]
                dot(f, x, y, sparkle_colors[j % 5])

        # Rising particles on later frames
        if i >= 2:
            for p in range(i - 1):
                px = cx - 3 + (p * 3)
                py = cy - i * 2 - p
                if 0 <= px < 32 and 0 <= py < 32:
                    dot(f, px, py, SG if p % 2 == 0 else MV)

        frames.append(f)

    sheet = hstack(frames)
    dual_write(
        os.path.join(ART_VFX, 'vfx_pet_dismiss.png'),
        'vfx_pet_dismiss.png',
        sheet,
    )


# ═════════════════════════════════════════════════════════════════════════════
# 5. PET INTERACTION ICONS (16×16 each)
# ═════════════════════════════════════════════════════════════════════════════

def generate_pet_icons():
    """Generate 4 pet interaction icons."""
    print('\n=== Pet Interaction Icons (16×16 each) ===')

    # ── Feed icon — apple/food item ──
    feed = blank(16, 16)
    # apple body
    rect(feed, 5, 6, 6, 6, BR)      # red apple
    rect(feed, 6, 7, 4, 4, ER)      # darker center
    dot(feed, 9, 6, FR)             # highlight
    # stem
    vline(feed, 8, 3, 3, BD)
    # leaf
    dot(feed, 9, 3, FG)
    dot(feed, 10, 3, LG)
    # outline
    outline(feed, 4, 5, 8, 8, K)

    dual_write(
        os.path.join(ART_PETS, 'icon_pet_feed.png'),
        'icon_pet_feed.png',
        feed,
    )

    # ── Play icon — bouncing ball ──
    play = blank(16, 16)
    # ball
    rect(play, 5, 5, 6, 6, PB)
    rect(play, 6, 6, 4, 4, SB)
    dot(play, 6, 6, HB)  # shine
    outline(play, 5, 5, 6, 6, DP)
    # star sparkle (fun!)
    dot(play, 3, 3, YL)
    dot(play, 12, 4, YL)
    dot(play, 4, 11, GD)
    # bounce motion lines
    dot(play, 7, 12, LS)
    dot(play, 8, 13, MG)

    dual_write(
        os.path.join(ART_PETS, 'icon_pet_play.png'),
        'icon_pet_play.png',
        play,
    )

    # ── Rename icon — quill/pencil ──
    rename = blank(16, 16)
    # pencil body (diagonal)
    dot(rename, 4, 12, DG)  # tip
    dot(rename, 5, 11, SN)
    dot(rename, 6, 10, SN)
    dot(rename, 7, 9, SN)
    dot(rename, 8, 8, DS)
    dot(rename, 9, 7, DS)
    dot(rename, 10, 6, DS)
    dot(rename, 11, 5, BD)  # eraser end
    dot(rename, 12, 4, ER)
    # pencil outline
    dot(rename, 3, 12, K)
    dot(rename, 5, 12, K)
    dot(rename, 4, 13, K)
    # writing line underneath
    hline(rename, 3, 14, 10, MG)

    dual_write(
        os.path.join(ART_PETS, 'icon_pet_rename.png'),
        'icon_pet_rename.png',
        rename,
    )

    # ── Dismiss icon — wave goodbye / X mark ──
    dismiss = blank(16, 16)
    # circle background
    rect(dismiss, 4, 4, 8, 8, DB)
    outline(dismiss, 4, 4, 8, 8, ER)
    # X mark
    dot(dismiss, 6, 6, NW); dot(dismiss, 7, 7, NW)
    dot(dismiss, 8, 8, NW); dot(dismiss, 9, 9, NW)
    dot(dismiss, 9, 6, NW); dot(dismiss, 8, 7, NW)
    dot(dismiss, 7, 8, NW); dot(dismiss, 6, 9, NW)

    dual_write(
        os.path.join(ART_PETS, 'icon_pet_dismiss.png'),
        'icon_pet_dismiss.png',
        dismiss,
    )


# ═════════════════════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    print('Generating companion pet art assets for PixelRealm...\n')
    generate_pet_spritesheets()
    generate_pet_ui()
    generate_pet_accessories()
    generate_summon_vfx()
    generate_dismiss_vfx()
    generate_pet_icons()
    print('\nDone! All pet assets generated.')
