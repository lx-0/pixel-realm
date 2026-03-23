# PixelRealm Distribution & Marketing Assets

**Version:** 0.1.0
**Last Updated:** 2026-03-23

---

## Existing Promo Assets

Located in `assets/promo/`:

| File | Dimensions | Purpose |
|---|---|---|
| `logo_pixelrealm.png` | 640×200 | Logo raster (cyan "PIXEL" + gold "REALM") |
| `logo_pixelrealm.svg` | 640×200 | Logo vector source |
| `banner_promo_960x540.png` | 960×540 | Primary itch.io banner |
| `cover_itchio_630x500.png` | 630×500 | itch.io cover image |

---

## Marketing Assets (itch.io Store Page)

Located in `assets/marketing/`. Generated from existing game assets using `scripts/gen_marketing_assets.py`.

### Gameplay Screenshots (960×540, PNG)

Composited at 320×180 native resolution, scaled ×3 with nearest-neighbor to preserve pixel-perfect crispness.

| File | Scene | Systems Showcased |
|---|---|---|
| `screenshot_combat_forest.png` | Forest biome combat | Real-time combat, enemy AI, VFX (fireball), HP/MP HUD, minimap |
| `screenshot_housing_interior.png` | Player house interior | Housing system, furniture placement, edit mode UI, decoration |
| `screenshot_pvp_arena.png` | Gladiator arena PvP | 1v1 PvP, rank badges (Gold/Silver), match timer, spectators |
| `screenshot_crafting_town.png` | Town crafting station | Crafting UI panel, NPC shopkeeper, quest markers, craft VFX |
| `screenshot_dungeon_boss.png` | Dungeon boss encounter | Boss fight, party system (3-player), heal VFX, party HP bars |
| `screenshot_town_social.png` | Town social scene | Multiplayer, chat bubbles, NPCs, parallax backgrounds, exploration |

### Animated GIF Previews

| File | Duration | Content |
|---|---|---|
| `preview_combat.gif` | ~2.4s loop | Warrior approach → attack → fireball VFX → goblin knockback |
| `preview_exploration.gif` | ~3.6s loop | Walking through forest with parallax scrolling and day/night transition |
| `preview_arena_pvp.gif` | ~2.0s loop | Arena PvP exchange — warrior melee vs mage ice counter-attack |

### Store Banners (960×540, PNG)

| File | Theme | Notes |
|---|---|---|
| `banner_store_light.png` | Daytime | Blue sky, parallax hills, character lineup, slime enemy, gold border |
| `banner_store_dark.png` | Nighttime | Stars, crescent moon, campfire glow, red enemy eyes, atmospheric |

Both banners include: logo text ("PIXEL REALM"), subtitle ("PIXELATED MMORPG ADVENTURE"), and tagline ("EXPLORE FIGHT BUILD CONQUER").

### Features Infographic (960×540, PNG)

| File | Content |
|---|---|
| `infographic_features.png` | 3×3 grid showing 9 game features: Combat, Housing, PvP Arena, Crafting, Dungeons, Quests, Weather, Guilds, Day/Night. Each cell has a color-coded border and icon. |

---

## Asset Specs

- **Native resolution:** 320×180 px (matches game canvas)
- **Display scale:** ×3 (960×540) for screenshots and banners
- **Color palette:** 32-color master palette from `docs/ART-STYLE-GUIDE.md`
- **Scaling:** Nearest-neighbor only (no anti-aliasing)
- **Format:** PNG (lossless) for stills, GIF for animations
- **Border:** Gold pixel border on all marketing assets

---

## Regenerating Assets

To regenerate all marketing assets from current game sprites and tilesets:

```bash
python3 scripts/gen_marketing_assets.py
```

Requires: Python 3, Pillow. Output: `assets/marketing/`.

---

## itch.io Page Recommendations

**Banner:** Use `banner_store_dark.png` as the primary header (dark theme is more eye-catching). Keep `banner_store_light.png` as a seasonal/alternate option.

**Screenshots:** Display in this order for maximum impact:
1. `screenshot_combat_forest.png` — first impression, shows core loop
2. `screenshot_dungeon_boss.png` — party play, impressive boss
3. `screenshot_pvp_arena.png` — competitive hook
4. `screenshot_housing_interior.png` — building/social hook
5. `screenshot_town_social.png` — multiplayer community
6. `screenshot_crafting_town.png` — depth of systems

**GIFs:** Embed `preview_combat.gif` and `preview_arena_pvp.gif` in the page description for motion.

**Cover:** Continue using existing `assets/promo/cover_itchio_630x500.png`.
