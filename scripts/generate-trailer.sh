#!/usr/bin/env bash
# PixelRealm Animated Trailer Generator
# Composes existing game assets into a promotional trailer sequence
# Output: animated GIF (960x540) and MP4
set -euo pipefail

ASSETS="/host-workdir/companies/PixelForgeStudios/projects/PixelRealm/assets"
SCREENSHOTS="$ASSETS/press-kit/screenshots"
MARKETING="$ASSETS/marketing"
PRESSKIT="$ASSETS/press-kit"
LOGO="$PRESSKIT/logos/logo_pixelrealm_dark_bg_1280.png"
TMP="$MARKETING/trailer_tmp"
OUT_GIF="$MARKETING/trailer_pixelrealm.gif"
OUT_MP4="$MARKETING/trailer_pixelrealm.mp4"

W=960
H=540

rm -rf "$TMP"
mkdir -p "$TMP/scenes"

echo "=== PixelRealm Trailer Generator ==="
echo ""

# --- Color palette (matching game's pixel art dark UI theme) ---
BG_DARK="#1a1a2e"
TEXT_PRIMARY="#FFD700"    # Gold - matches game UI
TEXT_SECONDARY="#4FC3F7"  # Cyan-blue - matches "PIXEL" in logo
TEXT_WHITE="#EAEAEA"
ACCENT_RED="#FF4444"
BANNER_BG="rgba(0,0,0,0.7)"

# --- Helper: create a scene with text overlay banner ---
create_scene_with_banner() {
  local input="$1"
  local output="$2"
  local headline="$3"
  local subtext="${4:-}"
  local banner_pos="${5:-south}"  # south or north

  if [ "$banner_pos" = "south" ]; then
    local y_headline=$((H - 70))
    local y_subtext=$((H - 38))
    local banner_y=$((H - 90))
    # Dark banner at bottom
    convert "$input" \
      -fill "rgba(0,0,0,0.75)" -draw "rectangle 0,$banner_y $W,$H" \
      -font "DejaVu-Sans-Bold" -pointsize 28 \
      -fill "$TEXT_PRIMARY" -gravity South -annotate +0+42 "$headline" \
      ${subtext:+-font "DejaVu-Sans" -pointsize 16 -fill "$TEXT_WHITE" -gravity South -annotate +0+16 "$subtext"} \
      "$output"
  else
    # Dark banner at top
    convert "$input" \
      -fill "rgba(0,0,0,0.75)" -draw "rectangle 0,0 $W,90" \
      -font "DejaVu-Sans-Bold" -pointsize 28 \
      -fill "$TEXT_PRIMARY" -gravity North -annotate +0+20 "$headline" \
      ${subtext:+-font "DejaVu-Sans" -pointsize 16 -fill "$TEXT_WHITE" -gravity North -annotate +0+58 "$subtext"} \
      "$output"
  fi
}

# ============================================================
# SCENE 1: Title Screen (logo on dark background)
# ============================================================
echo "[1/9] Title screen..."
# Resize logo to fit 960 wide, center on dark bg
convert -size ${W}x${H} xc:"$BG_DARK" \
  \( "$LOGO" -resize 720x -background none -gravity center \) \
  -gravity center -composite \
  -font "DejaVu-Sans" -pointsize 18 \
  -fill "$TEXT_SECONDARY" -gravity South -annotate +0+40 "A  PIXELATED  MMORPG  ADVENTURE" \
  -fill "$TEXT_WHITE" -gravity South -annotate +0+16 "PLAY  FREE  ON  ITCH.IO" \
  "$TMP/scenes/scene01_title.png"

# ============================================================
# SCENE 2: Class Selection Montage
# ============================================================
echo "[2/9] Class selection..."
# The class_showcase_all.png is already a great composed scene at 960x540
cp "$PRESSKIT/class-showcase/class_showcase_all.png" "$TMP/scenes/scene02_classes.png"

# ============================================================
# SCENE 3: Forest Combat
# ============================================================
echo "[3/9] Forest combat..."
create_scene_with_banner \
  "$SCREENSHOTS/01_combat_forest.png" \
  "$TMP/scenes/scene03_forest.png" \
  "REAL-TIME  COMBAT" \
  "Battle enemies across diverse biomes"

# ============================================================
# SCENE 4: Dodge Combat (different biome feel)
# ============================================================
echo "[4/9] Dodge combat..."
create_scene_with_banner \
  "$MARKETING/screenshot_dodge_combat.png" \
  "$TMP/scenes/scene04_dodge.png" \
  "SKILL-BASED  DODGING" \
  "Time your moves to survive"

# ============================================================
# SCENE 5: Dungeon Boss / Raid
# ============================================================
echo "[5/9] Raid boss encounter..."
create_scene_with_banner \
  "$SCREENSHOTS/06_dungeon_boss.png" \
  "$TMP/scenes/scene05_boss.png" \
  "EPIC  RAID  BOSSES" \
  "Team up for massive encounters" \
  "north"

# ============================================================
# SCENE 6: PvP Arena
# ============================================================
echo "[6/9] PvP arena..."
create_scene_with_banner \
  "$SCREENSHOTS/05_pvp_arena.png" \
  "$TMP/scenes/scene06_pvp.png" \
  "RANKED  PVP  ARENA" \
  "Climb the leaderboards"

# ============================================================
# SCENE 7: World Map Exploration
# ============================================================
echo "[7/9] World exploration..."
create_scene_with_banner \
  "$SCREENSHOTS/02_exploration_world_map.png" \
  "$TMP/scenes/scene07_world.png" \
  "EXPLORE  A  VAST  WORLD" \
  "19 unique zones to discover" \
  "south"

# ============================================================
# SCENE 8: Crafting & Guild Social
# ============================================================
echo "[8/9] Crafting & social..."
# Use the guild social screenshot (shows multiple players together)
create_scene_with_banner \
  "$SCREENSHOTS/04_guild_social.png" \
  "$TMP/scenes/scene08_social.png" \
  "BUILD  YOUR  GUILD" \
  "Craft, trade, and socialize"

# ============================================================
# SCENE 9: End Card
# ============================================================
echo "[9/9] End card..."
convert -size ${W}x${H} xc:"$BG_DARK" \
  \( "$LOGO" -resize 640x -background none -gravity center \) \
  -gravity center -geometry +0-60 -composite \
  -font "DejaVu-Sans-Bold" -pointsize 24 \
  -fill "$TEXT_PRIMARY" -gravity center -annotate +0+80 "PLAY  NOW  -  FREE  ON  ITCH.IO" \
  -font "DejaVu-Sans" -pointsize 18 \
  -fill "$TEXT_SECONDARY" -gravity center -annotate +0+115 "pixelforgestudios.itch.io/pixelrealm" \
  -font "DejaVu-Sans" -pointsize 14 \
  -fill "$TEXT_WHITE" -gravity South -annotate +0+20 "4 Classes  ·  19 Zones  ·  Raids  ·  PvP  ·  Guilds  ·  Housing  ·  Crafting" \
  "$TMP/scenes/scene09_endcard.png"

echo ""
echo "=== Scene images created ==="
echo ""

# ============================================================
# ASSEMBLE: ffmpeg with crossfade transitions
# ============================================================
# Scene durations (seconds each scene is visible):
#   Title: 4s, Classes: 4s, Forest: 3s, Dodge: 3s,
#   Boss: 4s, PvP: 3s, World: 3s, Social: 3s, EndCard: 5s
# Crossfade: 0.8s between each scene
# Total: ~32s visible + transitions ≈ ~38-40s

FADE=0.8

echo "=== Generating MP4 with crossfade transitions ==="

# Build the ffmpeg filter for crossfades between 9 scenes
# Each input is a still image looped for its duration
ffmpeg -y -hide_banner -loglevel warning \
  -loop 1 -t 5   -i "$TMP/scenes/scene01_title.png" \
  -loop 1 -t 4.5 -i "$TMP/scenes/scene02_classes.png" \
  -loop 1 -t 4   -i "$TMP/scenes/scene03_forest.png" \
  -loop 1 -t 4   -i "$TMP/scenes/scene04_dodge.png" \
  -loop 1 -t 4.5 -i "$TMP/scenes/scene05_boss.png" \
  -loop 1 -t 4   -i "$TMP/scenes/scene06_pvp.png" \
  -loop 1 -t 4   -i "$TMP/scenes/scene07_world.png" \
  -loop 1 -t 4   -i "$TMP/scenes/scene08_social.png" \
  -loop 1 -t 6   -i "$TMP/scenes/scene09_endcard.png" \
  -filter_complex "
    [0:v]format=yuva444p,fade=t=in:st=0:d=1:alpha=1[v0];
    [1:v]format=yuva444p[v1];
    [2:v]format=yuva444p[v2];
    [3:v]format=yuva444p[v3];
    [4:v]format=yuva444p[v4];
    [5:v]format=yuva444p[v5];
    [6:v]format=yuva444p[v6];
    [7:v]format=yuva444p[v7];
    [8:v]format=yuva444p,fade=t=out:st=5:d=1:alpha=1[v8];

    [v0][v1]xfade=transition=fade:duration=${FADE}:offset=4.2[x01];
    [x01][v2]xfade=transition=slideleft:duration=${FADE}:offset=7.9[x02];
    [x02][v3]xfade=transition=slideleft:duration=${FADE}:offset=11.1[x03];
    [x03][v4]xfade=transition=fade:duration=${FADE}:offset=14.3[x04];
    [x04][v5]xfade=transition=slideleft:duration=${FADE}:offset=18.0[x05];
    [x05][v6]xfade=transition=fade:duration=${FADE}:offset=21.2[x06];
    [x06][v7]xfade=transition=slideleft:duration=${FADE}:offset=24.4[x07];
    [x07][v8]xfade=transition=fade:duration=${FADE}:offset=27.6[xfinal];

    [xfinal]format=yuv420p[vout]
  " \
  -map "[vout]" \
  -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
  -r 15 \
  "$OUT_MP4"

echo "MP4 created: $OUT_MP4"

# ============================================================
# GENERATE GIF from MP4
# ============================================================
echo ""
echo "=== Generating optimized GIF ==="

# Two-pass GIF for quality: generate palette, then use it
ffmpeg -y -hide_banner -loglevel warning \
  -i "$OUT_MP4" \
  -vf "fps=10,scale=${W}:${H}:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" \
  "$TMP/palette.png"

ffmpeg -y -hide_banner -loglevel warning \
  -i "$OUT_MP4" \
  -i "$TMP/palette.png" \
  -lavfi "fps=10,scale=${W}:${H}:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
  "$OUT_GIF"

echo "GIF created: $OUT_GIF"
echo ""

# ============================================================
# CLEANUP
# ============================================================
echo "=== Trailer generation complete ==="
GIF_SIZE=$(du -h "$OUT_GIF" | cut -f1)
MP4_SIZE=$(du -h "$OUT_MP4" | cut -f1)
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT_MP4" 2>/dev/null | cut -d. -f1)
echo "  GIF: $OUT_GIF ($GIF_SIZE)"
echo "  MP4: $OUT_MP4 ($MP4_SIZE)"
echo "  Duration: ~${DURATION}s"
echo "  Resolution: ${W}x${H}"
echo "  Scenes: 9 (title, classes, 2x combat, boss raid, pvp, world, social, end card)"
