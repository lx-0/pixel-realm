#!/usr/bin/env python3
"""
Generate guild system art assets for PixelRealm (PIX-70).
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md:
  - 32-color master palette only
  - Nearest-neighbor scaling
  - Consistent naming convention

Assets produced:
  Guild emblems (32×32 each):
    icon_guild_emblem_lion.png       — lion/beast crest
    icon_guild_emblem_dragon.png     — dragon silhouette
    icon_guild_emblem_shield.png     — shield & crossed swords
    icon_guild_emblem_crown.png      — royal crown
    icon_guild_emblem_star.png       — radiant star
    icon_guild_emblem_phoenix.png    — phoenix wings
    icon_guild_emblem_wolf.png       — wolf howling
    icon_guild_emblem_skull.png      — skull with crossbones

  Guild roster panel:
    ui_panel_guild_roster.png        — 220×200 roster panel

  Guild role icons (16×16):
    icon_guild_rank_leader.png       — golden crown
    icon_guild_rank_officer.png      — silver shield
    icon_guild_rank_member.png       — bronze badge

  Guild creation dialog:
    ui_panel_guild_create.png        — 180×140 creation dialog

  Guild chat assets (16×16):
    icon_guild_chat_tab.png          — chat tab icon
    ui_guild_chat_bubble.png         — 64×24 chat bubble frame

  Guild tag banner:
    ui_guild_tag_banner.png          — 48×12 name banner

  Guild info panel:
    ui_panel_guild_info.png          — 220×180 info panel

  Online status indicators (8×8):
    icon_guild_status_online.png     — green dot
    icon_guild_status_offline.png    — gray dot
    icon_guild_status_away.png       — yellow dot
"""

import struct
import zlib
import os

SCRIPT_DIR  = os.path.dirname(__file__)
OUT_DIR     = os.path.join(SCRIPT_DIR, '..', 'public', 'assets')
ART_UI      = os.path.join(SCRIPT_DIR, '..', 'assets', 'ui')
ART_GUILD   = os.path.join(ART_UI, 'guild')
ART_ICONS   = os.path.join(ART_UI, 'icons')

for d in [OUT_DIR, ART_GUILD, ART_ICONS]:
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
FL  = (168, 228, 160, 255)  # light foliage

# Cyan / player-friendly
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / highlight
IW  = (200, 240, 255, 255)  # shimmer

# Red / danger
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


def draw_circle_filled(grid, cx, cy, r, color):
    """Draw a filled circle (integer pixel coords)."""
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r:
                set_pixel(grid, cx + dx, cy + dy, color)


def draw_line_h(grid, x, y, length, color):
    """Horizontal line."""
    for i in range(length):
        set_pixel(grid, x + i, y, color)


def draw_line_v(grid, x, y, length, color):
    """Vertical line."""
    for i in range(length):
        set_pixel(grid, x, y + i, color)


# ─── Emblem base (shield shape) ─────────────────────────────────────────────

def make_emblem_base(bg_color, border_color, highlight_color):
    """32×32 shield-shaped emblem base with border."""
    g = blank(32, 32)
    # Shield body — pointed bottom, rounded top
    # Top section (rows 4-18): nearly full width
    for y in range(4, 19):
        left = 5
        right = 26
        draw_line_h(g, left, y, right - left + 1, bg_color)
    # Taper section (rows 19-26): narrows to a point
    for y in range(19, 27):
        inset = (y - 18) * 1
        left = 5 + inset
        right = 26 - inset
        if left <= right:
            draw_line_h(g, left, y, right - left + 1, bg_color)
    # Point (row 27)
    set_pixel(g, 15, 27, bg_color)
    set_pixel(g, 16, 27, bg_color)

    # Border — trace the outline
    # Top edge
    draw_line_h(g, 5, 3, 22, border_color)
    # Left and right edges
    for y in range(4, 19):
        set_pixel(g, 4, y, border_color)
        set_pixel(g, 27, y, border_color)
    # Taper edges
    for y in range(19, 27):
        inset = (y - 18) * 1
        left = 4 + inset
        right = 27 - inset
        if left <= right:
            set_pixel(g, left, y, border_color)
            set_pixel(g, right, y, border_color)
    # Bottom point
    set_pixel(g, 15, 28, border_color)
    set_pixel(g, 16, 28, border_color)

    # Inner highlight rim (1px inside the border, top half)
    draw_line_h(g, 6, 4, 20, highlight_color)
    for y in range(5, 12):
        set_pixel(g, 5, y, highlight_color)

    return g


# ─── Guild Emblems (32×32) ───────────────────────────────────────────────────

def gen_emblem_lion():
    """Lion emblem — fierce beast head silhouette."""
    g = make_emblem_base(OC, DG, GD)
    # Simplified lion face in gold on dark blue
    # Mane (outer)
    for y in range(8, 16):
        for x in range(10, 22):
            dist = abs(x - 16) + abs(y - 12)
            if dist <= 7:
                set_pixel(g, x, y, DG)
    # Mane highlight
    for y in range(9, 15):
        for x in range(11, 21):
            dist = abs(x - 16) + abs(y - 12)
            if dist <= 5:
                set_pixel(g, x, y, SN)
    # Face center
    draw_rect(g, 13, 10, 6, 7, GD)
    draw_rect(g, 14, 11, 4, 5, YL)
    # Eyes
    set_pixel(g, 14, 12, K)
    set_pixel(g, 17, 12, K)
    # Nose
    set_pixel(g, 15, 14, DG)
    set_pixel(g, 16, 14, DG)
    # Mouth
    set_pixel(g, 14, 15, DG)
    set_pixel(g, 15, 16, DG)
    set_pixel(g, 16, 16, DG)
    set_pixel(g, 17, 15, DG)
    # Crown nubs on top of mane
    set_pixel(g, 13, 7, GD)
    set_pixel(g, 16, 6, GD)
    set_pixel(g, 19, 7, GD)
    return g


def gen_emblem_dragon():
    """Dragon emblem — dragon head silhouette."""
    g = make_emblem_base(DB, DG, GD)
    # Dragon head profile in red/orange on dark background
    # Head shape
    draw_rect(g, 11, 9, 10, 9, ER)
    draw_rect(g, 12, 10, 8, 7, BR)
    # Horns
    set_pixel(g, 12, 7, FR)
    set_pixel(g, 13, 8, FR)
    set_pixel(g, 19, 7, FR)
    set_pixel(g, 18, 8, FR)
    # Snout
    draw_rect(g, 18, 13, 4, 3, ER)
    draw_rect(g, 19, 14, 3, 2, BR)
    # Eye
    set_pixel(g, 14, 12, YL)
    set_pixel(g, 15, 12, PY)
    # Nostril
    set_pixel(g, 20, 13, K)
    # Jaw
    draw_line_h(g, 14, 18, 8, ER)
    draw_line_h(g, 15, 19, 6, DG)
    # Teeth
    set_pixel(g, 17, 17, NW)
    set_pixel(g, 19, 17, NW)
    # Fire breath hint
    set_pixel(g, 22, 14, FR)
    set_pixel(g, 23, 13, YL)
    set_pixel(g, 23, 15, EM)
    return g


def gen_emblem_shield():
    """Shield & crossed swords emblem."""
    g = make_emblem_base(DP, DG, GD)
    # Inner mini-shield
    draw_rect(g, 12, 9, 8, 10, SB)
    draw_rect(g, 13, 10, 6, 8, PB)
    draw_rect_outline(g, 12, 9, 8, 10, DG)
    # Cross on shield
    draw_line_h(g, 14, 13, 4, GD)
    draw_line_v(g, 15, 11, 6, GD)
    draw_line_v(g, 16, 11, 6, GD)
    # Crossed swords behind
    # Left sword (diagonal hint)
    set_pixel(g, 8, 7, LS)
    set_pixel(g, 9, 8, LS)
    set_pixel(g, 10, 9, MG)
    set_pixel(g, 8, 6, GD)   # pommel
    # Right sword
    set_pixel(g, 23, 7, LS)
    set_pixel(g, 22, 8, LS)
    set_pixel(g, 21, 9, MG)
    set_pixel(g, 23, 6, GD)  # pommel
    # Sword blades extending below
    set_pixel(g, 10, 19, LS)
    set_pixel(g, 9, 20, MG)
    set_pixel(g, 21, 19, LS)
    set_pixel(g, 22, 20, MG)
    return g


def gen_emblem_crown():
    """Royal crown emblem."""
    g = make_emblem_base(PM, DG, GD)
    # Crown shape on deep magic purple background
    # Base band
    draw_rect(g, 10, 16, 12, 3, GD)
    draw_rect(g, 11, 17, 10, 1, YL)
    # Crown points
    draw_rect(g, 10, 12, 3, 5, GD)
    draw_rect(g, 14, 10, 4, 7, GD)
    draw_rect(g, 19, 12, 3, 5, GD)
    # Tips
    set_pixel(g, 11, 11, YL)
    set_pixel(g, 15, 9, YL)
    set_pixel(g, 16, 9, YL)
    set_pixel(g, 20, 11, YL)
    # Gems
    set_pixel(g, 11, 14, BR)   # ruby left
    set_pixel(g, 15, 12, SB)   # sapphire center
    set_pixel(g, 16, 12, SB)
    set_pixel(g, 20, 14, BR)   # ruby right
    # Highlight on band
    draw_line_h(g, 11, 16, 10, PY)
    # Velvet interior hint
    draw_rect(g, 12, 13, 2, 3, MP)
    draw_rect(g, 18, 13, 1, 3, MP)
    return g


def gen_emblem_star():
    """Radiant star emblem."""
    g = make_emblem_base(OC, DG, GD)
    # 5-pointed star shape
    cx, cy = 16, 14
    # Core
    draw_rect(g, 14, 12, 4, 4, YL)
    draw_rect(g, 15, 13, 2, 2, PY)
    # Star points
    # Top
    set_pixel(g, 15, 9, GD)
    set_pixel(g, 16, 9, GD)
    set_pixel(g, 15, 10, YL)
    set_pixel(g, 16, 10, YL)
    set_pixel(g, 15, 11, YL)
    set_pixel(g, 16, 11, YL)
    # Bottom-left
    set_pixel(g, 11, 19, GD)
    set_pixel(g, 12, 18, YL)
    set_pixel(g, 13, 17, YL)
    # Bottom-right
    set_pixel(g, 20, 19, GD)
    set_pixel(g, 19, 18, YL)
    set_pixel(g, 18, 17, YL)
    # Left
    set_pixel(g, 10, 12, GD)
    set_pixel(g, 11, 12, YL)
    set_pixel(g, 12, 13, YL)
    set_pixel(g, 13, 13, YL)
    # Right
    set_pixel(g, 21, 12, GD)
    set_pixel(g, 20, 12, YL)
    set_pixel(g, 19, 13, YL)
    set_pixel(g, 18, 13, YL)
    # Rays (small glow)
    set_pixel(g, 15, 8, DG)
    set_pixel(g, 16, 8, DG)
    set_pixel(g, 9, 12, DG)
    set_pixel(g, 22, 12, DG)
    set_pixel(g, 10, 20, DG)
    set_pixel(g, 21, 20, DG)
    return g


def gen_emblem_phoenix():
    """Phoenix wings emblem — fiery bird rising."""
    g = make_emblem_base(DB, DG, GD)
    # Phoenix body (center)
    draw_rect(g, 14, 12, 4, 6, FR)
    draw_rect(g, 15, 13, 2, 4, YL)
    # Head
    set_pixel(g, 15, 11, FR)
    set_pixel(g, 16, 11, FR)
    set_pixel(g, 15, 10, YL)
    set_pixel(g, 16, 10, YL)
    # Eye
    set_pixel(g, 15, 10, K)
    # Left wing
    set_pixel(g, 13, 13, FR)
    set_pixel(g, 12, 12, FR)
    set_pixel(g, 11, 11, ER)
    set_pixel(g, 10, 10, ER)
    set_pixel(g, 9, 9, DG)
    set_pixel(g, 12, 14, EM)
    set_pixel(g, 11, 13, FR)
    set_pixel(g, 10, 12, ER)
    # Right wing (mirror)
    set_pixel(g, 18, 13, FR)
    set_pixel(g, 19, 12, FR)
    set_pixel(g, 20, 11, ER)
    set_pixel(g, 21, 10, ER)
    set_pixel(g, 22, 9, DG)
    set_pixel(g, 19, 14, EM)
    set_pixel(g, 20, 13, FR)
    set_pixel(g, 21, 12, ER)
    # Tail flames
    set_pixel(g, 15, 18, ER)
    set_pixel(g, 16, 18, ER)
    set_pixel(g, 14, 19, FR)
    set_pixel(g, 15, 20, YL)
    set_pixel(g, 16, 20, YL)
    set_pixel(g, 17, 19, FR)
    set_pixel(g, 15, 21, EM)
    set_pixel(g, 16, 21, EM)
    return g


def gen_emblem_wolf():
    """Wolf howling emblem."""
    g = make_emblem_base(DF, DG, GD)
    # Wolf silhouette — howling pose
    # Body
    draw_rect(g, 11, 15, 8, 5, MG)
    draw_rect(g, 12, 16, 6, 3, LS)
    # Neck (angled up-right)
    draw_rect(g, 16, 11, 3, 5, MG)
    draw_rect(g, 17, 12, 2, 3, LS)
    # Head (tilted up for howl)
    draw_rect(g, 17, 9, 4, 3, MG)
    draw_rect(g, 18, 10, 2, 2, LS)
    # Snout pointing up
    set_pixel(g, 19, 8, MG)
    set_pixel(g, 20, 8, LS)
    set_pixel(g, 20, 7, MG)  # tip
    # Eye
    set_pixel(g, 18, 10, K)
    # Ear
    set_pixel(g, 17, 8, ST)
    set_pixel(g, 17, 7, MG)
    # Legs
    draw_line_v(g, 12, 20, 3, MG)
    draw_line_v(g, 13, 20, 3, LS)
    draw_line_v(g, 17, 20, 3, MG)
    draw_line_v(g, 18, 20, 3, LS)
    # Tail
    set_pixel(g, 10, 15, MG)
    set_pixel(g, 9, 14, LS)
    set_pixel(g, 8, 13, MG)
    set_pixel(g, 8, 12, LS)
    # Moon (small crescent)
    set_pixel(g, 8, 7, PY)
    set_pixel(g, 9, 6, PY)
    set_pixel(g, 10, 6, PY)
    set_pixel(g, 11, 7, PY)
    set_pixel(g, 9, 7, PS)
    set_pixel(g, 10, 7, PS)
    return g


def gen_emblem_skull():
    """Skull with crossbones emblem."""
    g = make_emblem_base(DK, DG, GD)
    # Skull
    draw_rect(g, 12, 9, 8, 7, PG)
    draw_rect(g, 13, 10, 6, 5, NW)
    # Rounded top
    set_pixel(g, 13, 8, PG)
    set_pixel(g, 14, 8, PG)
    set_pixel(g, 17, 8, PG)
    set_pixel(g, 18, 8, PG)
    set_pixel(g, 14, 7, LS)
    set_pixel(g, 15, 7, PG)
    set_pixel(g, 16, 7, PG)
    set_pixel(g, 17, 7, LS)
    # Eye sockets
    draw_rect(g, 13, 11, 2, 2, K)
    draw_rect(g, 17, 11, 2, 2, K)
    # Nose
    set_pixel(g, 15, 13, ST)
    set_pixel(g, 16, 13, ST)
    # Jaw
    draw_rect(g, 13, 16, 6, 2, LS)
    # Teeth
    set_pixel(g, 13, 16, NW)
    set_pixel(g, 15, 16, NW)
    set_pixel(g, 17, 16, NW)
    set_pixel(g, 14, 16, K)
    set_pixel(g, 16, 16, K)
    set_pixel(g, 18, 16, K)
    # Crossbones
    # Bone 1 (top-left to bottom-right)
    for i in range(8):
        set_pixel(g, 8 + i, 18 + (i // 2), PG)
    # Bone 2 (top-right to bottom-left)
    for i in range(8):
        set_pixel(g, 23 - i, 18 + (i // 2), PG)
    # Bone ends (knobs)
    set_pixel(g, 7, 18, NW)
    set_pixel(g, 24, 18, NW)
    set_pixel(g, 11, 22, NW)
    set_pixel(g, 20, 22, NW)
    return g


# ─── Guild Role Icons (16×16) ───────────────────────────────────────────────

def gen_rank_leader():
    """Golden crown icon for guild leader."""
    g = blank(16, 16)
    # Crown base band
    draw_rect(g, 3, 10, 10, 3, GD)
    draw_rect(g, 4, 11, 8, 1, YL)
    # Crown points (3 peaks)
    draw_rect(g, 3, 7, 3, 4, GD)
    draw_rect(g, 6, 5, 4, 6, GD)
    draw_rect(g, 11, 7, 3, 4, GD)
    # Tips
    set_pixel(g, 4, 6, YL)
    set_pixel(g, 7, 4, YL)
    set_pixel(g, 8, 4, YL)
    set_pixel(g, 12, 6, YL)
    # Gems
    set_pixel(g, 4, 9, BR)   # ruby
    set_pixel(g, 8, 7, SB)   # sapphire
    set_pixel(g, 12, 9, BR)  # ruby
    # Outline
    draw_rect_outline(g, 2, 4, 12, 10, K)
    # Highlight
    draw_line_h(g, 4, 10, 8, PY)
    return g


def gen_rank_officer():
    """Silver shield icon for guild officer."""
    g = blank(16, 16)
    # Shield shape
    for y in range(3, 10):
        draw_line_h(g, 4, y, 8, LS)
    for y in range(10, 13):
        inset = y - 9
        draw_line_h(g, 4 + inset, y, 8 - 2 * inset, MG)
    set_pixel(g, 7, 13, MG)
    set_pixel(g, 8, 13, MG)
    # Border
    for y in range(3, 10):
        set_pixel(g, 3, y, K)
        set_pixel(g, 12, y, K)
    draw_line_h(g, 3, 2, 10, K)
    for y in range(10, 13):
        inset = y - 9
        set_pixel(g, 3 + inset, y, K)
        set_pixel(g, 12 - inset, y, K)
    set_pixel(g, 7, 14, K)
    set_pixel(g, 8, 14, K)
    # Shield highlight
    draw_line_h(g, 5, 3, 6, PG)
    set_pixel(g, 4, 4, PG)
    # Cross emblem in center
    draw_line_h(g, 6, 7, 4, ST)
    draw_line_v(g, 7, 5, 6, ST)
    draw_line_v(g, 8, 5, 6, ST)
    return g


def gen_rank_member():
    """Bronze badge icon for guild member."""
    g = blank(16, 16)
    # Circle badge
    draw_circle_filled(g, 8, 8, 5, DT)
    draw_circle_filled(g, 8, 8, 4, SN)
    draw_circle_filled(g, 8, 8, 3, DS)
    # Star in center
    set_pixel(g, 8, 5, YL)
    set_pixel(g, 7, 7, YL)
    set_pixel(g, 8, 7, YL)
    set_pixel(g, 9, 7, YL)
    set_pixel(g, 8, 8, PY)
    set_pixel(g, 8, 9, YL)
    set_pixel(g, 6, 8, YL)
    set_pixel(g, 10, 8, YL)
    # Outline
    for dy in range(-6, 7):
        for dx in range(-6, 7):
            r2 = dx * dx + dy * dy
            if 25 <= r2 <= 36:
                set_pixel(g, 8 + dx, 8 + dy, K)
    return g


# ─── Online Status Indicators (8×8) ─────────────────────────────────────────

def gen_status_online():
    g = blank(8, 8)
    draw_circle_filled(g, 4, 4, 3, LG)
    draw_circle_filled(g, 4, 4, 2, BG)
    set_pixel(g, 3, 3, FL)
    return g


def gen_status_offline():
    g = blank(8, 8)
    draw_circle_filled(g, 4, 4, 3, ST)
    draw_circle_filled(g, 4, 4, 2, MG)
    set_pixel(g, 3, 3, LS)
    return g


def gen_status_away():
    g = blank(8, 8)
    draw_circle_filled(g, 4, 4, 3, DG)
    draw_circle_filled(g, 4, 4, 2, GD)
    set_pixel(g, 3, 3, YL)
    return g


# ─── Guild Chat Assets ──────────────────────────────────────────────────────

def gen_chat_tab():
    """16×16 chat tab icon — speech bubble."""
    g = blank(16, 16)
    # Speech bubble body
    draw_rect(g, 2, 3, 12, 7, PB)
    draw_rect(g, 3, 4, 10, 5, SB)
    # Rounded corners
    set_pixel(g, 2, 3, _)
    set_pixel(g, 13, 3, _)
    set_pixel(g, 2, 9, _)
    set_pixel(g, 13, 9, _)
    # Tail
    set_pixel(g, 4, 10, PB)
    set_pixel(g, 3, 11, PB)
    set_pixel(g, 2, 12, PB)
    # Outline
    draw_line_h(g, 3, 2, 10, K)
    set_pixel(g, 1, 3, K)
    set_pixel(g, 14, 3, K)
    set_pixel(g, 1, 9, K)
    set_pixel(g, 14, 9, K)
    draw_line_h(g, 5, 10, 9, K)
    set_pixel(g, 4, 11, K)
    set_pixel(g, 3, 12, K)
    set_pixel(g, 1, 12, K)
    set_pixel(g, 1, 4, K)
    set_pixel(g, 14, 4, K)
    draw_line_v(g, 1, 4, 5, K)
    draw_line_v(g, 14, 4, 5, K)
    # Chat dots
    set_pixel(g, 5, 6, NW)
    set_pixel(g, 8, 6, NW)
    set_pixel(g, 11, 6, NW)
    return g


def gen_chat_bubble():
    """64×24 chat bubble frame (stretchable center)."""
    g = blank(64, 24)
    # Main bubble
    draw_rect(g, 2, 2, 60, 16, DK)
    draw_rect(g, 3, 3, 58, 14, ST)
    draw_rect(g, 4, 4, 56, 12, DK)
    # Highlight on top border
    draw_line_h(g, 4, 3, 56, MG)
    # Tail at bottom
    set_pixel(g, 8, 18, ST)
    set_pixel(g, 7, 19, ST)
    set_pixel(g, 6, 20, ST)
    set_pixel(g, 9, 18, DK)
    set_pixel(g, 8, 19, DK)
    set_pixel(g, 7, 20, DK)
    # Outline
    draw_line_h(g, 3, 1, 58, K)
    draw_line_h(g, 3, 18, 58, K)
    draw_line_v(g, 1, 2, 16, K)
    draw_line_v(g, 62, 2, 16, K)
    set_pixel(g, 2, 1, K)
    set_pixel(g, 61, 1, K)
    set_pixel(g, 2, 18, K)
    set_pixel(g, 61, 18, K)
    # Tail outline
    set_pixel(g, 7, 18, K)
    set_pixel(g, 6, 19, K)
    set_pixel(g, 5, 20, K)
    set_pixel(g, 5, 21, K)
    set_pixel(g, 6, 21, K)
    set_pixel(g, 7, 21, K)
    set_pixel(g, 8, 20, K)
    return g


# ─── Guild Tag Banner (48×12) ───────────────────────────────────────────────

def gen_tag_banner():
    """48×12 guild name tag that displays next to player names."""
    g = blank(48, 12)
    # Banner body
    draw_rect(g, 2, 1, 44, 10, DG)
    draw_rect(g, 3, 2, 42, 8, GD)
    draw_rect(g, 4, 3, 40, 6, DG)
    # Highlight stripe
    draw_line_h(g, 4, 3, 40, YL)
    draw_line_h(g, 4, 8, 40, SN)
    # Banner tails (notched ends)
    # Left tail
    set_pixel(g, 1, 2, DG)
    set_pixel(g, 1, 9, DG)
    set_pixel(g, 0, 3, DG)
    set_pixel(g, 0, 8, DG)
    set_pixel(g, 0, 5, _)
    set_pixel(g, 0, 6, _)
    # Right tail
    set_pixel(g, 46, 2, DG)
    set_pixel(g, 46, 9, DG)
    set_pixel(g, 47, 3, DG)
    set_pixel(g, 47, 8, DG)
    set_pixel(g, 47, 5, _)
    set_pixel(g, 47, 6, _)
    # Outline
    draw_line_h(g, 2, 0, 44, K)
    draw_line_h(g, 2, 11, 44, K)
    draw_line_v(g, 1, 1, 1, K)
    draw_line_v(g, 46, 1, 1, K)
    draw_line_v(g, 1, 10, 1, K)
    draw_line_v(g, 46, 10, 1, K)
    return g


# ─── Guild Roster Panel (220×200) ───────────────────────────────────────────

def gen_panel_roster():
    """220×200 guild roster panel — member list with online indicators."""
    W, H = 220, 200
    g = blank(W, H)

    # Outer border
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar (gold accent for guild)
    draw_rect(g, 2, 2, W - 4, 16, DG)
    draw_rect(g, 3, 3, W - 6, 14, GD)
    draw_line_h(g, 4, 4, W - 8, YL)   # top highlight
    draw_line_h(g, 4, 15, W - 8, DG)  # bottom shadow

    # Content area background
    draw_rect(g, 4, 20, W - 8, H - 26, DK)
    draw_rect(g, 5, 21, W - 10, H - 28, ST)

    # Member list rows (10 row slots, 16px each)
    for i in range(10):
        y = 24 + i * 16
        row_bg = MG if i % 2 == 0 else ST
        draw_rect(g, 6, y, W - 12, 14, row_bg)
        draw_rect_outline(g, 6, y, W - 12, 14, DK)

        # Online status indicator spot (left side)
        cx, cy = 14, y + 7
        draw_circle_filled(g, cx, cy, 2, LG if i < 5 else (GD if i < 7 else MG))

        # Rank icon placeholder (small colored square)
        rank_color = YL if i == 0 else (LS if i < 3 else DS)
        draw_rect(g, 22, y + 3, 8, 8, rank_color)
        draw_rect_outline(g, 22, y + 3, 8, 8, K)

        # Name area (horizontal bar placeholder)
        draw_rect(g, 34, y + 4, 80, 6, DK)
        draw_rect(g, 35, y + 5, 78, 4, row_bg)

        # Level area
        draw_rect(g, 120, y + 4, 24, 6, DK)

        # Role label area
        draw_rect(g, 150, y + 3, 40, 8, DK)
        draw_rect(g, 151, y + 4, 38, 6, row_bg)

    # Bottom bar — buttons
    btn_y = H - 18
    # Invite button
    draw_rect(g, 6, btn_y, 60, 14, DP)
    draw_rect(g, 7, btn_y + 1, 58, 12, SB)
    draw_line_h(g, 8, btn_y + 1, 56, PB)
    draw_rect_outline(g, 6, btn_y, 60, 14, K)

    # Kick button
    draw_rect(g, 72, btn_y, 60, 14, DB)
    draw_rect(g, 73, btn_y + 1, 58, 12, ER)
    draw_line_h(g, 74, btn_y + 1, 56, BR)
    draw_rect_outline(g, 72, btn_y, 60, 14, K)

    # Settings button
    draw_rect(g, 150, btn_y, 60, 14, DK)
    draw_rect(g, 151, btn_y + 1, 58, 12, MG)
    draw_line_h(g, 152, btn_y + 1, 56, LS)
    draw_rect_outline(g, 150, btn_y, 60, 14, K)

    # Decorative corner accents (gold)
    for corner in [(3, 3), (W - 6, 3), (3, H - 6), (W - 6, H - 6)]:
        set_pixel(g, corner[0], corner[1], GD)
        set_pixel(g, corner[0] + 1, corner[1], DG)
        set_pixel(g, corner[0], corner[1] + 1, DG)

    return g


# ─── Guild Creation Dialog (180×140) ────────────────────────────────────────

def gen_panel_create():
    """180×140 guild creation dialog with name input and emblem selector."""
    W, H = 180, 140
    g = blank(W, H)

    # Outer frame
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar
    draw_rect(g, 2, 2, W - 4, 14, DG)
    draw_rect(g, 3, 3, W - 6, 12, GD)
    draw_line_h(g, 4, 3, W - 8, YL)
    draw_line_h(g, 4, 13, W - 8, DG)

    # Content background
    draw_rect(g, 4, 18, W - 8, H - 24, DK)
    draw_rect(g, 5, 19, W - 10, H - 26, ST)

    # "Guild Name" input field
    draw_rect(g, 10, 24, 160, 16, DK)
    draw_rect(g, 11, 25, 158, 14, MG)
    draw_rect(g, 12, 26, 156, 12, NW)
    draw_rect_outline(g, 10, 24, 160, 16, K)
    # Cursor blink line
    draw_line_v(g, 16, 28, 8, K)

    # "Select Emblem" label area
    draw_rect(g, 10, 46, 80, 10, DK)
    draw_rect(g, 11, 47, 78, 8, ST)

    # Emblem selector grid (2 rows × 4 columns of 24×24 slots)
    for row in range(2):
        for col in range(4):
            ex = 10 + col * 40
            ey = 60 + row * 28
            # Slot background
            draw_rect(g, ex, ey, 24, 24, DK)
            draw_rect(g, ex + 1, ey + 1, 22, 22, MG)
            draw_rect_outline(g, ex, ey, 24, 24, K)
            # Mini emblem placeholder (colored shield shape)
            colors = [GD, ER, SB, MP, LG, FR, LS, DG]
            ci = row * 4 + col
            draw_rect(g, ex + 6, ey + 4, 12, 12, colors[ci])
            draw_rect(g, ex + 7, ey + 5, 10, 10, colors[ci])
            # Shield point
            set_pixel(g, ex + 11, ey + 17, colors[ci])
            set_pixel(g, ex + 12, ey + 17, colors[ci])

    # Selection highlight on first emblem
    draw_rect_outline(g, 9, 59, 26, 26, YL)
    draw_rect_outline(g, 8, 58, 28, 28, GD)

    # Bottom buttons
    btn_y = H - 22
    # Create button (green/positive)
    draw_rect(g, 20, btn_y, 60, 16, DF)
    draw_rect(g, 21, btn_y + 1, 58, 14, FG)
    draw_line_h(g, 22, btn_y + 1, 56, LG)
    draw_rect_outline(g, 20, btn_y, 60, 16, K)

    # Cancel button (red/negative)
    draw_rect(g, 100, btn_y, 60, 16, DB)
    draw_rect(g, 101, btn_y + 1, 58, 14, ER)
    draw_line_h(g, 102, btn_y + 1, 56, BR)
    draw_rect_outline(g, 100, btn_y, 60, 16, K)

    return g


# ─── Guild Info Panel (220×180) ─────────────────────────────────────────────

def gen_panel_info():
    """220×180 guild info panel with decorative elements."""
    W, H = 220, 180
    g = blank(W, H)

    # Outer frame
    draw_rect(g, 0, 0, W, H, K)
    draw_rect(g, 1, 1, W - 2, H - 2, DK)
    draw_rect(g, 2, 2, W - 4, H - 4, ST)

    # Title bar (gold guild accent)
    draw_rect(g, 2, 2, W - 4, 16, DG)
    draw_rect(g, 3, 3, W - 6, 14, GD)
    draw_line_h(g, 4, 4, W - 8, YL)
    draw_line_h(g, 4, 15, W - 8, DG)

    # Content area
    draw_rect(g, 4, 20, W - 8, H - 26, DK)
    draw_rect(g, 5, 21, W - 10, H - 28, ST)

    # Emblem display area (large, centered)
    draw_rect(g, 80, 24, 60, 60, DK)
    draw_rect(g, 81, 25, 58, 58, MG)
    draw_rect_outline(g, 80, 24, 60, 60, GD)
    draw_rect_outline(g, 79, 23, 62, 62, K)
    # Placeholder shield shape inside
    for y in range(30, 50):
        draw_line_h(g, 95, y, 30, DP)
    for y in range(50, 60):
        inset = (y - 49) * 2
        if 95 + inset < 125 - inset:
            draw_line_h(g, 95 + inset, y, 30 - 2 * inset, DP)

    # Guild name bar
    draw_rect(g, 30, 88, 160, 12, DK)
    draw_rect(g, 31, 89, 158, 10, GD)
    draw_line_h(g, 32, 89, 156, YL)

    # Stats section — 3 columns
    stats_y = 106
    for i, color in enumerate([SB, GD, LG]):
        sx = 10 + i * 70
        # Stat box
        draw_rect(g, sx, stats_y, 60, 24, DK)
        draw_rect(g, sx + 1, stats_y + 1, 58, 22, MG)
        # Color accent on top
        draw_line_h(g, sx + 2, stats_y + 1, 56, color)
        draw_line_h(g, sx + 2, stats_y + 2, 56, color)
        draw_rect_outline(g, sx, stats_y, 60, 24, K)
        # Value placeholder bar
        draw_rect(g, sx + 6, stats_y + 8, 48, 8, DK)
        draw_rect(g, sx + 7, stats_y + 9, 46, 6, ST)

    # Description / MOTD area
    motd_y = 136
    draw_rect(g, 10, motd_y, W - 20, 30, DK)
    draw_rect(g, 11, motd_y + 1, W - 22, 28, MG)
    draw_rect_outline(g, 10, motd_y, W - 20, 30, K)
    # Text line placeholders
    for line in range(3):
        ly = motd_y + 5 + line * 8
        draw_rect(g, 16, ly, W - 36, 4, ST)

    # Decorative corner elements (gold filigree dots)
    corners = [(4, 20), (W - 7, 20), (4, H - 7), (W - 7, H - 7)]
    for cx, cy in corners:
        set_pixel(g, cx, cy, GD)
        set_pixel(g, cx + 1, cy, DG)
        set_pixel(g, cx, cy + 1, DG)
        set_pixel(g, cx + 1, cy + 1, GD)

    # Divider lines (ornamental)
    draw_line_h(g, 20, 102, W - 40, DG)
    draw_line_h(g, 20, 103, W - 40, GD)
    draw_line_h(g, 20, 133, W - 40, DG)
    draw_line_h(g, 20, 134, W - 40, GD)
    # Diamond accents on dividers
    for div_y in [102, 133]:
        mid_x = W // 2
        set_pixel(g, mid_x, div_y - 1, GD)
        set_pixel(g, mid_x - 1, div_y, YL)
        set_pixel(g, mid_x + 1, div_y, YL)
        set_pixel(g, mid_x, div_y + 2, GD)

    return g


# ─── Main ────────────────────────────────────────────────────────────────────

def dual_write(rel_path, pixels):
    """Write to both assets/ source dir and public/assets/ deploy dir."""
    art_path = os.path.join(SCRIPT_DIR, '..', rel_path)
    os.makedirs(os.path.dirname(art_path), exist_ok=True)
    write_png(art_path, pixels)

    pub_path = os.path.join(OUT_DIR, os.path.basename(rel_path))
    write_png(pub_path, pixels)


def main():
    print('=== Generating Guild System Assets (PIX-70) ===\n')

    # ── Emblems ──
    print('-- Guild Emblems (32×32) --')
    emblems = [
        ('icon_guild_emblem_lion.png',    gen_emblem_lion),
        ('icon_guild_emblem_dragon.png',  gen_emblem_dragon),
        ('icon_guild_emblem_shield.png',  gen_emblem_shield),
        ('icon_guild_emblem_crown.png',   gen_emblem_crown),
        ('icon_guild_emblem_star.png',    gen_emblem_star),
        ('icon_guild_emblem_phoenix.png', gen_emblem_phoenix),
        ('icon_guild_emblem_wolf.png',    gen_emblem_wolf),
        ('icon_guild_emblem_skull.png',   gen_emblem_skull),
    ]
    for fname, gen_fn in emblems:
        dual_write(os.path.join('assets', 'ui', 'guild', fname), gen_fn())

    # ── Role Icons ──
    print('\n-- Guild Role Icons (16×16) --')
    dual_write('assets/ui/icons/icon_guild_rank_leader.png',  gen_rank_leader())
    dual_write('assets/ui/icons/icon_guild_rank_officer.png', gen_rank_officer())
    dual_write('assets/ui/icons/icon_guild_rank_member.png',  gen_rank_member())

    # ── Online Status Icons ──
    print('\n-- Online Status Indicators (8×8) --')
    dual_write('assets/ui/guild/icon_guild_status_online.png',  gen_status_online())
    dual_write('assets/ui/guild/icon_guild_status_offline.png', gen_status_offline())
    dual_write('assets/ui/guild/icon_guild_status_away.png',    gen_status_away())

    # ── Chat Assets ──
    print('\n-- Guild Chat Assets --')
    dual_write('assets/ui/guild/icon_guild_chat_tab.png',   gen_chat_tab())
    dual_write('assets/ui/guild/ui_guild_chat_bubble.png',  gen_chat_bubble())

    # ── Tag Banner ──
    print('\n-- Guild Tag Banner (48×12) --')
    dual_write('assets/ui/guild/ui_guild_tag_banner.png', gen_tag_banner())

    # ── Panels ──
    print('\n-- Guild UI Panels --')
    dual_write('assets/ui/guild/ui_panel_guild_roster.png', gen_panel_roster())
    dual_write('assets/ui/guild/ui_panel_guild_create.png', gen_panel_create())
    dual_write('assets/ui/guild/ui_panel_guild_info.png',   gen_panel_info())

    total = len(emblems) + 3 + 3 + 2 + 1 + 3  # emblems + ranks + status + chat + banner + panels
    print(f'\n=== Done! Generated {total} guild assets ===')


if __name__ == '__main__':
    main()
