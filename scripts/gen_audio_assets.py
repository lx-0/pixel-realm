#!/usr/bin/env python3
"""
Generate audio settings UI art assets for PixelRealm.
Uses only Python stdlib (struct + zlib) — no PIL required.

Follows docs/ART-STYLE-GUIDE.md exactly:
  - 32-color master palette, SNES-era RPG style
  - Nearest-neighbor pixel art, no anti-aliasing
  - Naming convention: {category}_{name}_{variant}_{size}.{ext}

Outputs:
  assets/ui/audio/ui_panel_audio.png         : 220×160  Audio settings panel frame
  assets/ui/audio/ui_slider_track.png        : 100×6    Volume slider track background
  assets/ui/audio/ui_slider_fill.png         : 100×6    Volume slider filled portion
  assets/ui/audio/ui_slider_handle.png       : 8×12     Volume slider handle/knob
  assets/ui/audio/icon_speaker_on.png        : 16×16    Speaker on icon
  assets/ui/audio/icon_speaker_off.png       : 16×16    Speaker off / low icon
  assets/ui/audio/icon_speaker_muted.png     : 16×16    Speaker muted icon (with X)
  assets/ui/audio/icon_music_note.png        : 16×16    Music note now-playing indicator
  assets/ui/audio/ui_equalizer.png           : 48×16    3-frame equalizer animation
  assets/ui/audio/ui_btn_apply.png           : 80×20    Apply button
  assets/ui/audio/ui_btn_reset.png           : 80×20    Reset defaults button
"""

import struct
import zlib
import os

SCRIPT_DIR = os.path.dirname(__file__)
PROJ_DIR = os.path.join(SCRIPT_DIR, '..')
AUDIO_DIR = os.path.join(PROJ_DIR, 'assets', 'ui', 'audio')
os.makedirs(AUDIO_DIR, exist_ok=True)

# ─── Palette (RGBA tuples) — from ART-STYLE-GUIDE.md ────────────────────────

_ = (0, 0, 0, 0)          # transparent

# Neutrals
K   = (13,  13,  13,  255)  # shadow black / outline
DK  = (43,  43,  43,  255)  # dark rock
ST  = (74,  74,  74,  255)  # stone gray
MG  = (110, 110, 110, 255)  # mid gray
LS  = (150, 150, 150, 255)  # light stone
PG  = (200, 200, 200, 255)  # pale gray
NW  = (240, 240, 240, 255)  # near white (highlight)

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

# Cyan / player
OC  = (10,  26,  58,  255)  # deep ocean
DP  = (26,  74,  138, 255)  # ocean blue
SB  = (42,  122, 192, 255)  # sky blue
PB  = (80,  168, 232, 255)  # player blue
HB  = (144, 208, 248, 255)  # ice / pale water
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

# ─── Sprite helpers ──────────────────────────────────────────────────────────

def blank(w, h, fill=None):
    fill = fill or _
    return [[fill]*w for __ in range(h)]

def copy_sprite(src):
    return [row[:] for row in src]

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

def fill_rect(grid, x, y, w, h, color):
    for dy in range(h):
        for dx in range(w):
            set_px(grid, x+dx, y+dy, color)

def draw_border(grid, x, y, w, h, color):
    """Draw a 1px rectangle outline."""
    for dx in range(w):
        set_px(grid, x+dx, y, color)
        set_px(grid, x+dx, y+h-1, color)
    for dy in range(h):
        set_px(grid, x, y+dy, color)
        set_px(grid, x+w-1, y+dy, color)

# ─── Letter drawing (tiny 3×5 pixel font for button labels) ─────────────────

FONT_3x5 = {
    'A': ["111","101","111","101","101"],
    'B': ["110","101","110","101","110"],
    'C': ["111","100","100","100","111"],
    'D': ["110","101","101","101","110"],
    'E': ["111","100","110","100","111"],
    'F': ["111","100","110","100","100"],
    'G': ["111","100","101","101","111"],
    'H': ["101","101","111","101","101"],
    'I': ["111","010","010","010","111"],
    'K': ["101","110","100","110","101"],
    'L': ["100","100","100","100","111"],
    'M': ["101","111","111","101","101"],
    'N': ["101","111","111","111","101"],
    'O': ["111","101","101","101","111"],
    'P': ["111","101","111","100","100"],
    'R': ["111","101","111","110","101"],
    'S': ["111","100","111","001","111"],
    'T': ["111","010","010","010","010"],
    'U': ["101","101","101","101","111"],
    'V': ["101","101","101","101","010"],
    'W': ["101","101","111","111","101"],
    'X': ["101","101","010","101","101"],
    'Y': ["101","101","111","010","010"],
    ' ': ["000","000","000","000","000"],
}

def draw_text(grid, text, x, y, color):
    """Draw text using the tiny 3×5 font. 4px per character (3 + 1 spacing)."""
    cx = x
    for ch in text.upper():
        glyph = FONT_3x5.get(ch, FONT_3x5[' '])
        for row_i, row_str in enumerate(glyph):
            for col_i, bit in enumerate(row_str):
                if bit == '1':
                    set_px(grid, cx + col_i, y + row_i, color)
        cx += 4


# ═══════════════════════════════════════════════════════════════════════════════
# 1. AUDIO SETTINGS PANEL (220×160)
# ═══════════════════════════════════════════════════════════════════════════════
# Matches style of ui_panel_crafting (220×180) and ui_panel_marketplace (220×160)
# Dark purple-tinted background with stone border, consistent with game UI

print('\n=== Audio Settings Panel ===')

panel = blank(220, 160, PM)  # deep magic background

# Outer border (1px black outline)
draw_border(panel, 0, 0, 220, 160, K)

# Inner border highlight (1px stone gray)
draw_border(panel, 1, 1, 218, 158, ST)

# Second inner border (dark rock)
draw_border(panel, 2, 2, 216, 156, DK)

# Fill interior with dark background
fill_rect(panel, 3, 3, 214, 154, PM)

# Top bar / title area (rows 3-14)
fill_rect(panel, 3, 3, 214, 12, DK)
draw_text(panel, "AUDIO SETTINGS", 72, 7, NW)

# Corner accents (gold studs like other panels)
for cx, cy in [(3, 3), (216, 3), (3, 156), (216, 156)]:
    set_px(panel, cx, cy, GD)
    set_px(panel, cx+1, cy, DG)
    set_px(panel, cx, cy+1, DG)

# Horizontal separator under title
fill_rect(panel, 4, 15, 212, 1, ST)

# Section labels area — "MASTER", "MUSIC", "SFX" labels with slider zones
# Master volume section (y=20..44)
fill_rect(panel, 6, 18, 208, 1, DK)
draw_text(panel, "MASTER", 10, 22, LS)

# Slider track placeholder zone
fill_rect(panel, 58, 24, 104, 6, DK)
draw_border(panel, 57, 23, 106, 8, ST)

# Music volume section (y=38..62)
fill_rect(panel, 6, 36, 208, 1, DK)
draw_text(panel, "MUSIC", 10, 42, LS)
fill_rect(panel, 58, 44, 104, 6, DK)
draw_border(panel, 57, 43, 106, 8, ST)

# SFX volume section (y=56..80)
fill_rect(panel, 6, 54, 208, 1, DK)
draw_text(panel, "SFX", 10, 60, LS)
fill_rect(panel, 58, 62, 104, 6, DK)
draw_border(panel, 57, 61, 106, 8, ST)

# Mute toggles placeholder area (right side)
# Small boxes where mute icons will sit
for section_y in [23, 43, 61]:
    draw_border(panel, 170, section_y, 18, 10, ST)
    fill_rect(panel, 171, section_y+1, 16, 8, DK)

# Percentage labels (right of mute boxes)
for section_y in [25, 45, 63]:
    draw_text(panel, "100", 193, section_y, MG)

# Divider before now-playing section
fill_rect(panel, 4, 78, 212, 1, ST)

# Now-playing section
draw_text(panel, "NOW PLAYING", 10, 84, LS)

# Music track display area (dark inset)
fill_rect(panel, 10, 94, 200, 14, DK)
draw_border(panel, 9, 93, 202, 16, ST)
draw_text(panel, "FOREST THEME", 50, 99, PB)

# Equalizer display area
fill_rect(panel, 14, 96, 30, 10, PM)

# Divider before buttons
fill_rect(panel, 4, 114, 212, 1, ST)

# Button placeholder areas
draw_border(panel, 30, 120, 72, 16, ST)
fill_rect(panel, 31, 121, 70, 14, DK)
draw_text(panel, "APPLY", 50, 126, NW)

draw_border(panel, 118, 120, 72, 16, ST)
fill_rect(panel, 119, 121, 70, 14, DK)
draw_text(panel, "RESET", 138, 126, LS)

# Close button (X) in top-right
fill_rect(panel, 206, 5, 9, 9, DK)
draw_border(panel, 205, 4, 11, 11, ST)
set_px(panel, 207, 6, BR)
set_px(panel, 208, 7, BR)
set_px(panel, 209, 8, BR)
set_px(panel, 210, 9, BR)
set_px(panel, 211, 10, BR)
set_px(panel, 211, 6, BR)
set_px(panel, 210, 7, BR)
set_px(panel, 208, 9, BR)
set_px(panel, 207, 10, BR)
set_px(panel, 209, 8, BR)  # center

write_png(os.path.join(AUDIO_DIR, 'ui_panel_audio.png'), panel)

# ═══════════════════════════════════════════════════════════════════════════════
# 2. VOLUME SLIDER SPRITES
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Volume Slider ===')

# Slider track (100×6) — dark groove
track = blank(100, 6, _)
fill_rect(track, 0, 0, 100, 6, DK)
# Top edge shadow
fill_rect(track, 0, 0, 100, 1, K)
# Bottom edge highlight
fill_rect(track, 0, 5, 100, 1, ST)
# Left/right caps
set_px(track, 0, 0, K)
set_px(track, 0, 5, K)
set_px(track, 99, 0, K)
set_px(track, 99, 5, K)
# Rounded corners
set_px(track, 0, 0, _)
set_px(track, 99, 0, _)
set_px(track, 0, 5, _)
set_px(track, 99, 5, _)
set_px(track, 1, 0, ST)
set_px(track, 98, 0, ST)

write_png(os.path.join(AUDIO_DIR, 'ui_slider_track.png'), track)

# Slider fill (100×6) — cyan/blue fill showing volume level
fill_bar = blank(100, 6, _)
fill_rect(fill_bar, 0, 0, 100, 6, SB)
# Top highlight
fill_rect(fill_bar, 0, 0, 100, 1, PB)
# Bottom shadow
fill_rect(fill_bar, 0, 5, 100, 1, DP)
# Rounded left edge
set_px(fill_bar, 0, 0, _)
set_px(fill_bar, 0, 5, _)
# Rounded right edge
set_px(fill_bar, 99, 0, _)
set_px(fill_bar, 99, 5, _)

write_png(os.path.join(AUDIO_DIR, 'ui_slider_fill.png'), fill_bar)

# Slider handle (8×12) — draggable knob
handle = blank(8, 12, _)
# Main body
fill_rect(handle, 1, 0, 6, 12, LS)
# Left column
fill_rect(handle, 0, 1, 1, 10, MG)
# Right column
fill_rect(handle, 7, 1, 1, 10, MG)
# Top edge
fill_rect(handle, 2, 0, 4, 1, NW)
# Bottom edge
fill_rect(handle, 2, 11, 4, 1, ST)
# Highlight line in center
fill_rect(handle, 3, 3, 2, 1, NW)
fill_rect(handle, 3, 5, 2, 1, NW)
fill_rect(handle, 3, 7, 2, 1, NW)
# Inner shadow
fill_rect(handle, 1, 1, 6, 1, NW)
fill_rect(handle, 1, 10, 6, 1, ST)
# Grip lines (dark)
fill_rect(handle, 3, 4, 2, 1, MG)
fill_rect(handle, 3, 6, 2, 1, MG)
fill_rect(handle, 3, 8, 2, 1, MG)
# Rounded corners
set_px(handle, 1, 0, _)
set_px(handle, 6, 0, _)
set_px(handle, 1, 11, _)
set_px(handle, 6, 11, _)

write_png(os.path.join(AUDIO_DIR, 'ui_slider_handle.png'), handle)

# ═══════════════════════════════════════════════════════════════════════════════
# 3. SPEAKER / MUTE ICONS (16×16 each)
# ═══════════════════════════════════════════════════════════════════════════════
# Color language: cyan/blue = friendly/safe UI elements

print('\n=== Speaker Icons ===')

# --- Speaker ON (with sound waves) ---
speaker_on = [
    #0  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 2
    [_, _,  _,  K,  SB, K,  _,  _,  _,  _,  _,  PB, _,  _,  _,  _],  # 3
    [_, _,  K,  SB, PB, SB, K,  _,  _,  _,  PB, _,  PB, _,  _,  _],  # 4
    [_, K,  SB, PB, PB, PB, SB, K,  _,  PB, _,  _,  _,  PB, _,  _],  # 5
    [_, K,  SB, PB, PB, PB, SB, K,  _,  PB, _,  _,  _,  PB, _,  _],  # 6
    [_, K,  SB, PB, PB, PB, SB, K,  _,  PB, _,  _,  _,  PB, _,  _],  # 7
    [_, K,  SB, PB, PB, PB, SB, K,  _,  PB, _,  _,  _,  PB, _,  _],  # 8
    [_, K,  SB, PB, PB, PB, SB, K,  _,  PB, _,  _,  _,  PB, _,  _],  # 9
    [_, K,  SB, PB, PB, PB, SB, K,  _,  PB, _,  _,  _,  PB, _,  _],  # 10
    [_, _,  K,  SB, PB, SB, K,  _,  _,  _,  PB, _,  PB, _,  _,  _],  # 11
    [_, _,  _,  K,  SB, K,  _,  _,  _,  _,  _,  PB, _,  _,  _,  _],  # 12
    [_, _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]

write_png(os.path.join(AUDIO_DIR, 'icon_speaker_on.png'), speaker_on)

# --- Speaker OFF (no waves, lower volume appearance) ---
speaker_off = [
    #0  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 2
    [_, _,  _,  K,  SB, K,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 3
    [_, _,  K,  SB, PB, SB, K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 4
    [_, K,  SB, PB, PB, PB, SB, K,  _,  _,  DP, _,  _,  _,  _,  _],  # 5
    [_, K,  SB, PB, PB, PB, SB, K,  _,  DP, _,  _,  _,  _,  _,  _],  # 6
    [_, K,  SB, PB, PB, PB, SB, K,  _,  DP, _,  _,  _,  _,  _,  _],  # 7
    [_, K,  SB, PB, PB, PB, SB, K,  _,  DP, _,  _,  _,  _,  _,  _],  # 8
    [_, K,  SB, PB, PB, PB, SB, K,  _,  DP, _,  _,  _,  _,  _,  _],  # 9
    [_, K,  SB, PB, PB, PB, SB, K,  _,  _,  DP, _,  _,  _,  _,  _],  # 10
    [_, _,  K,  SB, PB, SB, K,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 11
    [_, _,  _,  K,  SB, K,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 12
    [_, _,  _,  _,  K,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]

write_png(os.path.join(AUDIO_DIR, 'icon_speaker_off.png'), speaker_off)

# --- Speaker MUTED (with red X) ---
speaker_muted = copy_sprite(speaker_off)
# Draw red X over the wave area
set_px(speaker_muted, 9,  4,  BR)
set_px(speaker_muted, 10, 5,  BR)
set_px(speaker_muted, 11, 6,  BR)
set_px(speaker_muted, 12, 7,  BR)
set_px(speaker_muted, 13, 8,  BR)
set_px(speaker_muted, 13, 4,  BR)
set_px(speaker_muted, 12, 5,  BR)
set_px(speaker_muted, 11, 6,  BR)  # center
set_px(speaker_muted, 10, 7,  BR)
set_px(speaker_muted, 9,  8,  BR)
# Extend X a bit more
set_px(speaker_muted, 9,  9,  ER)
set_px(speaker_muted, 13, 9,  ER)
set_px(speaker_muted, 9,  3,  ER)
set_px(speaker_muted, 13, 3,  ER)

write_png(os.path.join(AUDIO_DIR, 'icon_speaker_muted.png'), speaker_muted)

# ═══════════════════════════════════════════════════════════════════════════════
# 4. MUSIC NOTE ICON (16×16)
# ═══════════════════════════════════════════════════════════════════════════════
# Color: gold/yellow = quest/XP/special items — music is a reward/feature

print('\n=== Music Note Icon ===')

music_note = [
    #0  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 0
    [_, _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  K,  _,  _,  _,  _],  # 1
    [_, _,  _,  _,  _,  K,  GD, GD, GD, GD, GD, GD, K,  _,  _,  _],  # 2
    [_, _,  _,  _,  _,  K,  YL, YL, YL, YL, YL, GD, K,  _,  _,  _],  # 3
    [_, _,  _,  _,  _,  _,  K,  K,  K,  K,  K,  GD, K,  _,  _,  _],  # 4
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  GD, K,  _,  _,  _],  # 5
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  GD, K,  _,  _,  _],  # 6
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  GD, K,  _,  _,  _],  # 7
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  GD, K,  _,  _,  _],  # 8
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  GD, K,  _,  _,  _],  # 9
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  K,  GD, K,  _,  _,  _],  # 10
    [_, _,  _,  _,  _,  _,  _,  _,  _,  K,  DG, GD, K,  _,  _,  _],  # 11
    [_, _,  _,  _,  _,  _,  _,  _,  K,  DG, GD, GD, K,  _,  _,  _],  # 12
    [_, _,  _,  _,  _,  _,  _,  _,  K,  GD, GD, K,  _,  _,  _,  _],  # 13
    [_, _,  _,  _,  _,  _,  _,  _,  _,  K,  K,  _,  _,  _,  _,  _],  # 14
    [_, _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _,  _],  # 15
]

write_png(os.path.join(AUDIO_DIR, 'icon_music_note.png'), music_note)

# ═══════════════════════════════════════════════════════════════════════════════
# 5. EQUALIZER / SOUND WAVE (48×16 spritesheet, 3 frames × 16×16)
# ═══════════════════════════════════════════════════════════════════════════════
# Animated equalizer bars — 3 frames showing bars at different heights
# Uses cyan/blue player-safe colors

print('\n=== Equalizer Animation ===')

def make_eq_frame(bar_heights):
    """Create a 16×16 equalizer frame with 5 bars at given heights (0-10)."""
    frame = blank(16, 16, _)
    bar_colors = [SB, PB, HB, PB, SB]
    bar_x_positions = [2, 5, 8, 11, 14]
    for i, (bx, bh) in enumerate(zip(bar_x_positions, bar_heights)):
        if bh <= 0:
            continue
        top = 14 - bh
        for y in range(top, 15):
            set_px(frame, bx, y, bar_colors[i])
        # Cap highlight
        set_px(frame, bx, top, IW)
        # Base
        set_px(frame, bx, 15, K)
    # Bottom baseline
    for x in range(1, 16):
        set_px(frame, x, 15, K)
    return frame

eq_frame1 = make_eq_frame([4, 8, 6, 10, 3])
eq_frame2 = make_eq_frame([7, 5, 10, 4, 8])
eq_frame3 = make_eq_frame([3, 10, 4, 7, 6])

equalizer = hstack([eq_frame1, eq_frame2, eq_frame3])
write_png(os.path.join(AUDIO_DIR, 'ui_equalizer.png'), equalizer)

# ═══════════════════════════════════════════════════════════════════════════════
# 6. BUTTON SPRITES (80×20 each)
# ═══════════════════════════════════════════════════════════════════════════════
# Match existing ui_btn.png style: 80×20, 9-slice compatible

print('\n=== Audio Buttons ===')

def make_button(text, bg_color, border_color, text_color, highlight_color):
    """Create an 80×20 button with centered text."""
    btn = blank(80, 20, _)
    # Outer border
    draw_border(btn, 0, 0, 80, 20, K)
    # Fill
    fill_rect(btn, 1, 1, 78, 18, bg_color)
    # Inner border / bevel top
    fill_rect(btn, 1, 1, 78, 1, highlight_color)
    fill_rect(btn, 1, 1, 1, 18, highlight_color)
    # Inner border / bevel bottom
    fill_rect(btn, 1, 18, 78, 1, border_color)
    fill_rect(btn, 78, 1, 1, 18, border_color)
    # Rounded corners (remove corner pixels)
    set_px(btn, 0, 0, _)
    set_px(btn, 79, 0, _)
    set_px(btn, 0, 19, _)
    set_px(btn, 79, 19, _)
    # Corner pixels
    set_px(btn, 1, 1, border_color)
    set_px(btn, 78, 1, border_color)
    set_px(btn, 1, 18, border_color)
    set_px(btn, 78, 18, border_color)
    # Center text
    text_w = len(text) * 4 - 1  # 3px char + 1px spacing, minus trailing
    text_x = (80 - text_w) // 2
    text_y = (20 - 5) // 2  # 5px tall font
    draw_text(btn, text, text_x, text_y, text_color)
    return btn

# Apply button — green-tinted (safe action)
btn_apply = make_button("APPLY", DF, FG, NW, LG)
write_png(os.path.join(AUDIO_DIR, 'ui_btn_apply.png'), btn_apply)

# Reset button — neutral stone (non-destructive reset)
btn_reset = make_button("RESET", DK, ST, LS, MG)
write_png(os.path.join(AUDIO_DIR, 'ui_btn_reset.png'), btn_reset)


# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════

print('\n=== Audio Asset Generation Complete ===')
print(f'All assets written to: {AUDIO_DIR}')
print("""
Assets:
  ui_panel_audio.png      220×160  Audio settings panel frame
  ui_slider_track.png     100×6    Volume slider track
  ui_slider_fill.png      100×6    Volume slider fill bar
  ui_slider_handle.png    8×12     Volume slider handle
  icon_speaker_on.png     16×16    Speaker with sound waves
  icon_speaker_off.png    16×16    Speaker quiet / low volume
  icon_speaker_muted.png  16×16    Speaker muted (red X)
  icon_music_note.png     16×16    Music note now-playing
  ui_equalizer.png        48×16    3-frame equalizer animation
  ui_btn_apply.png        80×20    Apply settings button
  ui_btn_reset.png        80×20    Reset defaults button
""")
