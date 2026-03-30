# PixelRealm Promotional Gallery

Promotional images for the itch.io page, press kit, and social media.

## Character Spotlights

| Class | itch.io (630x500) | Social Media (1200x675) |
|---|---|---|
| Warrior | `characters/promo_spotlight_warrior_630x500.svg` | `characters/promo_spotlight_warrior_1200x675.svg` |
| Mage | `characters/promo_spotlight_mage_630x500.svg` | `characters/promo_spotlight_mage_1200x675.svg` |
| Ranger | `characters/promo_spotlight_ranger_630x500.svg` | `characters/promo_spotlight_ranger_1200x675.svg` |
| Artisan | `characters/promo_spotlight_artisan_630x500.svg` | `characters/promo_spotlight_artisan_1200x675.svg` |

Each spotlight features:
- Large pixel-art character in signature pose
- Thematic background matching class identity
- Signature ability icons and particle effects
- Three archetype badges (branching specializations)
- PixelRealm watermark (bottom-right, 30% opacity)

## Biome Showcases

| Biome | itch.io (630x500) | Social Media (1200x675) |
|---|---|---|
| Enchanted Forest | `biomes/promo_showcase_enchanted_forest_630x500.svg` | `biomes/promo_showcase_enchanted_forest_1200x675.svg` |
| Volcanic Highlands | `biomes/promo_showcase_volcanic_highlands_630x500.svg` | `biomes/promo_showcase_volcanic_highlands_1200x675.svg` |
| Abyssal Depths | `biomes/promo_showcase_abyssal_depths_630x500.svg` | `biomes/promo_showcase_abyssal_depths_1200x675.svg` |
| Astral Pinnacle | `biomes/promo_showcase_astral_pinnacle_630x500.svg` | `biomes/promo_showcase_astral_pinnacle_1200x675.svg` |
| Frozen Tundra | `biomes/promo_showcase_frozen_tundra_630x500.svg` | `biomes/promo_showcase_frozen_tundra_1200x675.svg` |
| Ancient Dungeon | `biomes/promo_showcase_ancient_dungeon_630x500.svg` | `biomes/promo_showcase_ancient_dungeon_1200x675.svg` |

Each showcase features:
- Atmospheric pixel-art landscape composition
- Biome-specific palette from the master 32-color palette
- Environmental details (particles, lighting, terrain features)
- Biome title and flavor text
- PixelRealm watermark (bottom-right, 30% opacity)

## Specifications

- **Format**: SVG with `image-rendering: pixelated`
- **Palette**: Strictly uses the 32-color master palette (see `docs/ART-STYLE-GUIDE.md`)
- **Pixel grids**: 6px grid for 630x500, 8px grid for 1200x675
- **Fonts**: Monospace (pixel-style text rendered as SVG text elements)
- **Branding**: Subtle "PIXELREALM" watermark at 30% opacity in #c8c8c8

## Usage

- **itch.io page**: Use the 630x500 variants for embedded gallery
- **Social media**: Use the 1200x675 variants for Twitter/Discord/etc posts
- **Press kit**: Either size works; 1200x675 preferred for higher detail

## PNG Export

To convert SVGs to PNG for platforms that require raster images:

```bash
# Using Inkscape (recommended for pixel-perfect export)
inkscape input.svg --export-type=png --export-filename=output.png

# Using rsvg-convert
rsvg-convert -w 630 -h 500 input.svg > output.png
```
