# Land Parcel Building Assets (PIX-173 / M14e)

Art assets for the placeable buildings system on owned land parcels.
See PIX-172 for the engineering ticket that wires these in.

## Building sprites — `public/assets/nft/buildings/`

All sprites are **32×32 PNG with transparent background**. The in-game
footprint is one parcel tile (16×16); sprites are delivered at **2× render
resolution** so they stay crisp at the project's `×3` integer scale and any
future zoom levels.

Anchor: bottom-center. Render the sprite so its bottom 1–2 px shadow row
sits on the parcel-tile baseline. Center the sprite horizontally on the
tile (offset `x = tile.centerX - 16`, `y = tile.bottom - 32`).

| Asset | File | Reads as |
|---|---|---|
| House | `building_house.png` | Cozy cottage, red pitched roof + chimney |
| Shop | `building_shop.png` | Market stall, red-and-white striped canopy + goods on counter |
| Garden | `building_garden.png` | Wooden planter with herbs + small flower |

## UI icons — `public/assets/nft/`

All icons are **32×32 PNG, framed (matches existing NFT panel/icon style)**.
Use directly in the placement panel; do not crop.

| Asset | File | Use |
|---|---|---|
| House icon | `icon_building_house.png` | Building-type selector — house |
| Shop icon | `icon_building_shop.png` | Building-type selector — shop |
| Garden icon | `icon_building_garden.png` | Building-type selector — garden |
| Remove icon | `icon_building_remove.png` | Owner remove/undo action |

## Phaser loader snippet

```js
// In a preload scene / loader manifest
this.load.image('building_house',  '/assets/nft/buildings/building_house.png');
this.load.image('building_shop',   '/assets/nft/buildings/building_shop.png');
this.load.image('building_garden', '/assets/nft/buildings/building_garden.png');

this.load.image('icon_building_house',  '/assets/nft/icon_building_house.png');
this.load.image('icon_building_shop',   '/assets/nft/icon_building_shop.png');
this.load.image('icon_building_garden', '/assets/nft/icon_building_garden.png');
this.load.image('icon_building_remove', '/assets/nft/icon_building_remove.png');
```

## Style notes

- All colors are from the master palette in `docs/ART-STYLE-GUIDE.md`.
- Sprites use color language: red roofs/canopies for shop+house, green
  for the garden — easy to distinguish at a glance on a busy parcel.
- The remove icon uses the standard "red X over ghosted target" idiom
  so it reads as destructive.

## Regeneration

Source: `scripts/gen_building_assets.js`. Re-run with `node scripts/gen_building_assets.js`
to regenerate any of these assets after a palette or design tweak.
