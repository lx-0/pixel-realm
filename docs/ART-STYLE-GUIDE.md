# PixelRealm Art Style Guide

**Version:** 1.0
**Date:** 2026-03-16
**Status:** Active

---

## 1. Visual Identity

PixelRealm uses **16×16 tile-based pixel art** in the tradition of SNES-era RPGs (Final Fantasy VI, Secret of Mana). The aesthetic is warm, readable, and biome-rich — players can instantly identify tiles, characters, enemies, and interactables at a glance. We prioritize **silhouette clarity** and **color language** over fine detail.

**Design references:** Stardew Valley (warmth, readability), Pokémon FireRed (character expression at small scale), RuneScape classic (MMO UI density), Terraria (biome diversity), Shovel Knight (modern pixel fidelity).

---

## 2. Canvas & Scaling

| Setting | Value |
|---|---|
| Internal game canvas | 320 × 180 px |
| Tile size | 16 × 16 px |
| Character sprite size | 16 × 24 px |
| Display scale | ×3 (integer scaling only) |
| Character display size | 48 × 72 px |
| Rendering | WebGL (Phaser 3), Canvas fallback |
| Pixel filter | `nearest-neighbor` — no anti-aliasing, ever |

**Rule:** Never scale assets at non-integer multipliers. 320×180 → 960×540 → 1280×720 etc. Fractional scaling causes blurry pixels.

---

## 3. Color Palette

A **32-color master palette** derived from the SNES RGB gamut, organized by role. All game assets must use only colors from this palette. UI overlays may use transparency layers over palette colors.

### 3.1 Palette — Full Reference

```
NEUTRALS (terrain, walls, stone)
  #0d0d0d   Shadow black
  #2b2b2b   Dark rock
  #4a4a4a   Stone gray
  #6e6e6e   Mid gray
  #969696   Light stone
  #c8c8c8   Pale gray
  #f0f0f0   Near white

WARM EARTH (forest, plains, desert)
  #3b2010   Deep soil
  #6b3a1f   Rich earth
  #8b5c2a   Dirt
  #b8843f   Sand / sandstone
  #d4a85a   Desert gold
  #e8d08a   Pale sand

GREENS (nature, forest biome)
  #1a3a1a   Deep forest
  #2d6e2d   Forest green
  #4c9b4c   Leaf green
  #78c878   Bright grass
  #a8e4a0   Light foliage

CYAN / BLUE (player, safe zones, water)
  #0a1a3a   Deep ocean
  #1a4a8a   Ocean blue
  #2a7ac0   Sky blue
  #50a8e8   Player / friendly
  #90d0f8   Ice / pale water
  #c8f0ff   Highlight / shimmer

RED / ORANGE (enemies, fire, danger)
  #5a0a0a   Deep blood
  #a01010   Enemy red
  #d42020   Bright red / fire
  #f06020   Fire orange
  #f8a060   Ember

YELLOW / GOLD (quests, rarity, XP)
  #a87000   Dark gold
  #e8b800   Gold
  #ffe040   Bright yellow / XP
  #fff8a0   Pale highlight

PURPLE / MAGENTA (magic, mana)
  #1a0a3a   Deep magic
  #5a20a0   Magic purple
  #9050e0   Mana violet
  #d090ff   Spell glow
```

### 3.2 Color Language (Gameplay Semantics)

| Color | Role | Examples |
|---|---|---|
| Cyan `#50a8e8` | Player, friendly NPCs, safe zones | Player sprite main color, healer NPCs, waystone zones |
| Red `#d42020` / Orange `#f06020` | Enemies, danger, fire hazards | Enemy sprites, lava tiles, trap indicators |
| Green `#4c9b4c` / `#78c878` | Health, nature, loot drops | HP bar, healing items, item drop sparkles |
| Yellow `#ffe040` / Gold `#e8b800` | Quest markers, rare/legendary, XP | Quest exclamation mark, rare item border, XP orbs |
| Purple `#9050e0` | Magic, mana, mystical elements | Mana bar, spell VFX, enchanted tiles |
| Gray/Brown `#6e6e6e` / `#8b5c2a` | Neutral world terrain, walls | Ground tiles, stone walls, rocks |
| White pulse `#f0f0f0` → transparent | Hit confirmation, damage feedback | Flash on hit (2-frame white flash then back to normal) |
| Dark vignette `#0d0d0d` at 60% opacity | Dangerous/cursed areas | Screen edge darken in dungeons, cursed zone fog |
| Gold shimmer `#e8b800` + particle | NFT-minted items | Subtle animated sparkle on owned NFT gear |

---

## 4. Biome Color Themes

Each biome has a dominant tile color scheme. All biome tiles use palette colors only.

| Biome | Primary | Accent | Sky/Ambient |
|---|---|---|---|
| Forest | `#2d6e2d`, `#4c9b4c` | `#3b2010` (soil) | `#2a7ac0` |
| Desert | `#b8843f`, `#d4a85a` | `#a87000` (rock) | `#ffe040` (haze) |
| Ice / Tundra | `#90d0f8`, `#c8f0ff` | `#4a4a4a` (stone) | `#1a4a8a` |
| Volcanic | `#d42020`, `#f06020` | `#2b2b2b` (obsidian) | `#5a0a0a` (ash sky) |
| Ocean / Coral | `#1a4a8a`, `#2a7ac0` | `#50a8e8` (coral) | `#0a1a3a` |
| Dungeon | `#2b2b2b`, `#4a4a4a` | `#9050e0` (torchlight) | `#0d0d0d` |
| Town / Plains | `#78c878`, `#8b5c2a` | `#c8c8c8` (stone road) | `#2a7ac0` |

---

## 5. Sprite Specifications

### 5.1 Character Sprites

| Property | Value |
|---|---|
| Size | 16 × 24 px |
| Display size | 48 × 72 px (×3 scale) |
| Spritesheet columns | 4 (one per direction: down, left, right, up) |
| Animation rows | Walk, Idle, Attack, Cast, Death |
| Frame size in sheet | 16 × 24 px per frame |
| Background | Transparent (PNG, no background pixel) |

**Character structure (16×24):**
- Head: rows 0–7 (8px tall)
- Body: rows 8–18 (11px tall)
- Legs: rows 19–23 (5px tall)
- Maximum color use per sprite: 8 colors (drawn from master palette)

### 5.2 Tiles

| Property | Value |
|---|---|
| Tile size | 16 × 16 px |
| Tileset sheet | 16 tiles wide × N rows, PNG |
| Background | None (tiles fill fully) |
| Auto-tile support | 4-corner bitmask (Wang tiles), 16 variants per terrain type |

### 5.3 Enemies

| Size class | Pixel size | Display size |
|---|---|---|
| Small (slimes, insects) | 12 × 12 px (centered in 16×16 frame) | 36 × 36 px |
| Medium (humanoid) | 16 × 24 px | 48 × 72 px |
| Large (bosses) | 32 × 32 px | 96 × 96 px |
| Giant (world bosses) | 48 × 48 px | 144 × 144 px |

All enemy sprites use **warm color dominance** (reds, oranges) in their primary silhouette.

### 5.4 UI Elements

| Element | Size | Notes |
|---|---|---|
| Icon (skill, item) | 16 × 16 px | Displayed at 48×48 in hotbar |
| Large icon (inventory) | 24 × 24 px | Displayed at 48×48 |
| Button | 80 × 20 px | 9-slice scalable |
| Health/Mana bar segments | 1 × 8 px | Tiled horizontally |
| Cursor | 12 × 12 px | Custom pixel cursor |

---

## 6. Animation Conventions

### 6.1 Frame Rates

All animations run at **12 fps** unless specified. The game engine runs at 60 fps; animations use frame-stepping.

| Animation | Frames | Duration | Loop |
|---|---|---|---|
| Character idle | 2 | 167ms / frame | Yes |
| Character walk | 4 | 83ms / frame | Yes |
| Character attack | 6 | 50ms / frame (fast snappy) | No |
| Character cast | 8 | 83ms / frame | No |
| Character death | 6 | 100ms / frame | No (hold last frame) |
| Enemy idle | 2–4 | 150ms / frame | Yes |
| Enemy attack | 4–6 | 60ms / frame | No |
| Hit flash | 2 | White frame (50ms) → normal | No |
| Item pickup sparkle | 6 | 60ms / frame | No |
| NFT shimmer | 8 | 100ms / frame | Yes (subtle) |
| Tile water ripple | 4 | 200ms / frame | Yes |
| Fire tile | 4 | 80ms / frame | Yes |

### 6.2 Animation Style Rules

- **Squash & stretch** is subtle — 1px maximum deformation at pixel art scale.
- **Anticipation frames**: 1 frame wind-up before attack land.
- **Walk cycles**: Odd frame counts feel bouncier; even counts feel mechanical. Prefer 4-frame walk.
- **Death animations**: Character becomes flat/horizontal over the last 2 frames. No elaborate death poses.
- **Hit flash**: Replace all non-transparent pixels with `#f0f0f0` for 1 frame, then restore. No tweening.

---

## 7. Visual Effects (VFX)

VFX are code-generated particle systems in Phaser 3, using palette colors only.

| Effect | Colors | Particle count | Duration |
|---|---|---|---|
| Sword hit sparks | `#f0f0f0`, `#ffe040` | 4–6 | 300ms |
| Magic spell burst | `#9050e0`, `#d090ff`, `#f0f0f0` | 8–12 | 500ms |
| Heal pulse | `#4c9b4c`, `#78c878` | 6–8 | 400ms |
| XP orbs | `#ffe040`, `#e8b800` | 3–5 | 600ms |
| Item drop | `#78c878` (common), `#2a7ac0` (rare), `#e8b800` (legendary) | 4 | 500ms |
| NFT mint shimmer | `#e8b800`, `#ffe040`, `#f0f0f0` | 10–14 | 800ms (looping) |
| Death dissolve | `#2b2b2b`, `#0d0d0d` | 6–8 | 600ms |
| Level-up burst | `#ffe040`, `#f0f0f0`, `#9050e0` | 16 | 800ms |
| Fire hazard sparks | `#d42020`, `#f06020`, `#ffe040` | 8 | continuous |

---

## 8. Asset Naming Conventions

### 8.1 Format

```
{category}_{name}_{variant}_{size}.{ext}
```

- All lowercase, underscores only (no spaces, no hyphens).
- `variant` is optional (direction, color, state).
- `size` is optional and only included when multiple sizes exist.

### 8.2 Examples

```
# Tiles
tile_grass_01.png
tile_forest_tree_large.png
tile_dungeon_wall_top.png
tile_water_animated.png       (spritesheet, 4 frames)

# Characters
char_player_warrior.png       (full spritesheet: 4 dirs × 5 anims)
char_npc_merchant.png
char_enemy_slime_green.png
char_enemy_boss_dragon.png

# Items / Icons
icon_sword_iron.png
icon_potion_health.png
icon_skill_fireball.png
icon_currency_gold.png

# UI
ui_button_primary.png
ui_healthbar_fill.png
ui_panel_inventory.png
ui_cursor_default.png
ui_icon_quest.png

# VFX (spritesheets)
vfx_hit_spark.png             (6 frames, 16×16)
vfx_spell_burst.png           (8 frames, 32×32)
vfx_levelup.png               (10 frames, 48×48)
vfx_nft_shimmer.png           (8 frames, 32×32)

# Backgrounds / Environments
bg_town_day.png
bg_dungeon_entrance.png
tileset_forest.png            (full tileset sheet)
tileset_dungeon.png
```

### 8.3 Spritesheet Layout

All spritesheets use a **grid layout**. Phaser's `frameConfig` references by row/column.

```
Character spritesheets — 4 columns × N rows:
  Col 0 = facing down
  Col 1 = facing left
  Col 2 = facing right
  Col 3 = facing up

Animation row order:
  Row 0 = Idle     (2 frames)
  Row 1 = Walk     (4 frames)
  Row 2 = Attack   (6 frames)
  Row 3 = Cast     (8 frames)
  Row 4 = Death    (6 frames)
```

---

## 9. Directory Structure

```
assets/
├── reference/          ← Style guide samples (see below)
├── sprites/
│   ├── characters/     ← Player, NPCs, enemies
│   ├── enemies/
│   └── bosses/
├── tiles/
│   ├── tilesets/       ← Full tileset PNGs (for Phaser tilemap)
│   └── tiles/          ← Individual tile references
├── ui/
│   ├── icons/
│   ├── panels/
│   ├── buttons/
│   └── hud/
├── vfx/                ← Particle spritesheets
├── backgrounds/        ← Non-tiled BG art
└── fonts/              ← Pixel bitmap fonts
```

**All assets committed to git as PNG (lossless).** No JPEGs for game assets. SVG allowed only for design reference files in `assets/reference/`.

---

## 10. Day/Night Cycle — Palette Swapping

PixelRealm uses **palette swapping** (not post-processing filters) for the day/night cycle. Three palette variants exist per biome: Day, Dusk, Night.

| Time | Shift |
|---|---|
| Day | Base palette (no shift) |
| Dusk | All non-UI colors shifted toward `#d4a85a` (warm orange) by blending in Phaser's `tint` or shader |
| Night | All non-UI colors shifted toward `#1a4a8a` (cool blue) at 40% blend |

In Phaser 3, implement this via `scene.lights` or a fullscreen tint overlay at low opacity (e.g., `#1a4a8a` at alpha 0.35 for night). Tiles do not need separate night variants.

---

## 11. Accessibility Notes

- **Colorblind safety:** Critical gameplay information (enemy vs. player vs. pickup) is communicated via **silhouette shape AND color** simultaneously. Never rely on color alone.
- **Shape rule:** Enemies have angular/sharp silhouettes. Players/friendlies have rounded silhouettes. Pickups are small and glowing.
- Minimum contrast ratio for UI text: 4.5:1 against background.

---

## 12. Reference Assets

See `assets/reference/` for:

| File | Contents |
|---|---|
| `palette-swatches.svg` | All 32 palette colors with hex codes and roles |
| `color-language.svg` | Visual demo of color-to-gameplay-meaning mapping |
| `sprite-grid-template.svg` | Blank 16×24 character sprite grid overlay |
| `tile-grid-template.svg` | Blank 16×16 tile grid overlay |
| `biome-palette-sheet.svg` | Color combinations per biome |

---

## 13. Do's and Don'ts

| Do | Don't |
|---|---|
| Use colors from the 32-color master palette | Use off-palette colors "just this once" |
| Use `nearest-neighbor` scaling | Let the browser apply bilinear filtering |
| Use the color language consistently (red = danger) | Use red for a healing pickup |
| Keep character silhouettes readable at 16×24 | Add tiny detail that disappears at sprite size |
| Animate at 12fps using frame-stepping | Tween pixel art (creates blurry in-betweens) |
| Name files `char_enemy_slime_green.png` | Name files `SlimeSprite_FINAL_v3.png` |
| Export all assets as PNG (lossless) | Export sprite sheets as JPEG |
| Test readability at ×3 scale (48×72) | Only review at 1:1 scale |
