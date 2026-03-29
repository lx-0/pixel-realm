#!/usr/bin/env node
/**
 * Generate player housing system art assets for PIX-404 / PIX-320.
 * All assets use the 32-color master palette from ART-STYLE-GUIDE.md.
 * Pixel art PNG output with nearest-neighbor intent.
 *
 * Output: public/assets/housing/
 *
 * Assets produced:
 *   TILESETS (256×64 each — 16 tiles wide × 4 rows):
 *     tileset_house_small.png     — Cottage exterior walls, roof, floor
 *     tileset_house_medium.png    — Manor exterior walls, roof, floor
 *     tileset_house_large.png     — Estate exterior walls, roof, floor
 *     tileset_house_interior.png  — Interior walls, floors, carpets
 *
 *   FURNITURE SPRITES (16×16 each):
 *     sprite_furn_table.png, sprite_furn_chair.png, sprite_furn_bed.png,
 *     sprite_furn_shelf.png, sprite_furn_rug.png, sprite_furn_lamp.png,
 *     sprite_furn_fireplace.png, sprite_furn_chest.png
 *
 *   DECORATION SPRITES (16×16 each):
 *     sprite_decor_painting.png, sprite_decor_plant.png,
 *     sprite_decor_candles.png, sprite_decor_trophy.png,
 *     sprite_decor_banner.png, sprite_decor_pet_bed.png
 *
 *   YARD / GARDEN SPRITES (16×16 each):
 *     sprite_yard_fence.png, sprite_yard_fence_corner.png,
 *     sprite_yard_garden_bed.png, sprite_yard_flowerpot.png,
 *     sprite_yard_well.png, sprite_yard_lantern.png,
 *     sprite_yard_bench.png, sprite_yard_birdbath.png,
 *     sprite_yard_stepping_stone.png, sprite_yard_tree.png
 *
 *   DOOR & WINDOW VARIANTS (16×16 each):
 *     sprite_door_wood.png, sprite_door_iron.png, sprite_door_ornate.png,
 *     sprite_window_small.png, sprite_window_arched.png, sprite_window_shuttered.png
 *
 *   PLACEMENT UI (various sizes):
 *     ui_grid_overlay.png         — 16×16 placement grid cell
 *     ui_snap_indicator.png       — 16×16 snap point marker
 *     ui_grid_valid.png           — 16×16 valid placement highlight
 *     ui_grid_invalid.png         — 16×16 invalid placement highlight
 *
 *   HOUSING MENU UI PANELS:
 *     ui_panel_housing_inventory.png  — 220×180 furniture inventory
 *     ui_panel_housing_placement.png  — 160×120 placement mode HUD
 *     ui_panel_housing_storage.png    — 220×180 storage chest panel
 *     icon_housing_build.png          — 16×16 build mode icon
 *     icon_housing_decorate.png       — 16×16 decorate mode icon
 *     icon_housing_storage.png        — 16×16 storage icon
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ===== Master 32-color palette =====
const P = {
  // Neutrals
  black:       [0x0d, 0x0d, 0x0d],
  darkRock:    [0x2b, 0x2b, 0x2b],
  stoneGray:   [0x4a, 0x4a, 0x4a],
  midGray:     [0x6e, 0x6e, 0x6e],
  lightStone:  [0x96, 0x96, 0x96],
  paleGray:    [0xc8, 0xc8, 0xc8],
  nearWhite:   [0xf0, 0xf0, 0xf0],
  // Warm earth
  deepSoil:    [0x3b, 0x20, 0x10],
  richEarth:   [0x6b, 0x3a, 0x1f],
  dirt:        [0x8b, 0x5c, 0x2a],
  sand:        [0xb8, 0x84, 0x3f],
  desertGold:  [0xd4, 0xa8, 0x5a],
  paleSand:    [0xe8, 0xd0, 0x8a],
  // Greens
  deepForest:  [0x1a, 0x3a, 0x1a],
  forestGreen: [0x2d, 0x6e, 0x2d],
  leafGreen:   [0x4c, 0x9b, 0x4c],
  brightGrass: [0x78, 0xc8, 0x78],
  lightFoliage:[0xa8, 0xe4, 0xa0],
  // Cyan/Blue
  deepOcean:   [0x0a, 0x1a, 0x3a],
  oceanBlue:   [0x1a, 0x4a, 0x8a],
  skyBlue:     [0x2a, 0x7a, 0xc0],
  playerBlue:  [0x50, 0xa8, 0xe8],
  paleWater:   [0x90, 0xd0, 0xf8],
  highlight:   [0xc8, 0xf0, 0xff],
  // Red/Orange
  deepBlood:   [0x5a, 0x0a, 0x0a],
  enemyRed:    [0xa0, 0x10, 0x10],
  brightRed:   [0xd4, 0x20, 0x20],
  fireOrange:  [0xf0, 0x60, 0x20],
  ember:       [0xf8, 0xa0, 0x60],
  // Yellow/Gold
  darkGold:    [0xa8, 0x70, 0x00],
  gold:        [0xe8, 0xb8, 0x00],
  brightYellow:[0xff, 0xe0, 0x40],
  paleHighlight:[0xff, 0xf8, 0xa0],
  // Purple
  deepMagic:   [0x1a, 0x0a, 0x3a],
  magicPurple: [0x5a, 0x20, 0xa0],
  manaViolet:  [0x90, 0x50, 0xe0],
  spellGlow:   [0xd0, 0x90, 0xff],
};

const T = null; // transparent

// ===== PNG encoder (zlib only, no deps) =====
function writePNG(w, h, pixels) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const offset = y * (1 + w * 4);
    raw[offset] = 0; // filter none
    for (let x = 0; x < w; x++) {
      const c = pixels[y][x];
      const i = offset + 1 + x * 4;
      if (c === null) {
        raw[i] = 0; raw[i+1] = 0; raw[i+2] = 0; raw[i+3] = 0;
      } else {
        raw[i] = c[0]; raw[i+1] = c[1]; raw[i+2] = c[2]; raw[i+3] = 255;
      }
    }
  }
  const compressed = zlib.deflateSync(raw);
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

function save(w, h, pixels, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, writePNG(w, h, pixels));
  console.log(`  Created: ${filePath} (${w}×${h})`);
}

// ===== Drawing helpers =====
function makeGrid(w, h, fill = T) {
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill(fill));
  return grid;
}
function fillRect(grid, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length)
        grid[y][x] = color;
}
function drawRect(grid, x1, y1, x2, y2, color) {
  for (let x = x1; x <= x2; x++) {
    if (y1 >= 0 && y1 < grid.length) grid[y1][x] = color;
    if (y2 >= 0 && y2 < grid.length) grid[y2][x] = color;
  }
  for (let y = y1; y <= y2; y++) {
    if (x1 >= 0 && x1 < grid[0].length) grid[y][x1] = color;
    if (x2 >= 0 && x2 < grid[0].length) grid[y][x2] = color;
  }
}
function hLine(grid, x1, x2, y, color) {
  if (y < 0 || y >= grid.length) return;
  for (let x = x1; x <= x2; x++)
    if (x >= 0 && x < grid[0].length) grid[y][x] = color;
}
function vLine(grid, x, y1, y2, color) {
  if (x < 0 || x >= grid[0].length) return;
  for (let y = y1; y <= y2; y++)
    if (y >= 0 && y < grid.length) grid[y][x] = color;
}
function setPixel(grid, x, y, color) {
  if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = color;
}

const OUT = path.join(__dirname, '..', 'public', 'assets', 'housing');

// ========================================================================
// 1. HOUSE TILESETS (256×64 = 16 tiles wide × 4 rows of 16×16)
// Each tileset: row 0 = roof tiles, row 1 = wall tiles,
//               row 2 = floor/foundation, row 3 = details/trim
// ========================================================================
console.log('\n=== House Tilesets (256×64) ===');

function drawHouseTileset(name, roofColor, roofHighlight, wallColor, wallHighlight, wallShadow, trimColor, floorColor, floorAccent) {
  const w = 256, h = 64;
  const grid = makeGrid(w, h);

  // Row 0: Roof tiles (y 0–15)
  for (let tx = 0; tx < 16; tx++) {
    const ox = tx * 16;
    if (tx < 4) {
      // Solid roof tile variants
      fillRect(grid, ox, 0, ox+15, 15, roofColor);
      hLine(grid, ox, ox+15, 0, roofHighlight);
      if (tx === 1) { // roof with shingle detail
        for (let r = 3; r < 15; r += 4)
          hLine(grid, ox+1, ox+14, r, roofHighlight);
      } else if (tx === 2) { // roof edge left
        vLine(grid, ox, 0, 15, trimColor);
        vLine(grid, ox+1, 0, 15, roofHighlight);
      } else if (tx === 3) { // roof edge right
        vLine(grid, ox+15, 0, 15, trimColor);
        vLine(grid, ox+14, 0, 15, roofHighlight);
      }
    } else if (tx < 8) {
      // Roof corners and peak
      fillRect(grid, ox, 0, ox+15, 15, roofColor);
      if (tx === 4) { // top-left corner
        fillRect(grid, ox, 0, ox+7, 7, T);
        hLine(grid, ox+8, ox+15, 7, trimColor);
        vLine(grid, ox+8, 0, 7, trimColor);
        for (let d = 0; d < 8; d++) setPixel(grid, ox+8+d, 7-d, roofHighlight);
      } else if (tx === 5) { // top-right corner
        fillRect(grid, ox+8, 0, ox+15, 7, T);
        hLine(grid, ox, ox+7, 7, trimColor);
        vLine(grid, ox+7, 0, 7, trimColor);
        for (let d = 0; d < 8; d++) setPixel(grid, ox+7-d, 7-d, roofHighlight);
      } else if (tx === 6) { // roof peak center
        fillRect(grid, ox, 0, ox+15, 5, T);
        for (let d = 0; d < 8; d++) {
          setPixel(grid, ox+7-d, 5+d, roofColor);
          setPixel(grid, ox+8+d, 5+d, roofColor);
        }
        hLine(grid, ox, ox+15, 15, roofColor);
        hLine(grid, ox+4, ox+11, 9, roofColor);
        hLine(grid, ox+2, ox+13, 12, roofColor);
        setPixel(grid, ox+7, 5, roofHighlight);
        setPixel(grid, ox+8, 5, roofHighlight);
      } else { // chimney tile
        fillRect(grid, ox+4, 2, ox+11, 15, P.stoneGray);
        drawRect(grid, ox+4, 2, ox+11, 15, P.darkRock);
        fillRect(grid, ox+3, 0, ox+12, 3, P.midGray);
        hLine(grid, ox+3, ox+12, 0, P.darkRock);
        // Smoke pixels
        setPixel(grid, ox+7, 0, P.lightStone);
        setPixel(grid, ox+8, 0, P.paleGray);
      }
    } else {
      // Additional roof detail tiles (dormers, vents)
      fillRect(grid, ox, 0, ox+15, 15, roofColor);
      if (tx === 8) { // dormer window
        fillRect(grid, ox+4, 6, ox+11, 15, wallColor);
        drawRect(grid, ox+4, 6, ox+11, 15, trimColor);
        fillRect(grid, ox+6, 8, ox+9, 13, P.skyBlue);
        drawRect(grid, ox+6, 8, ox+9, 13, P.deepOcean);
        // Mini roof peak
        hLine(grid, ox+3, ox+12, 6, roofColor);
        hLine(grid, ox+5, ox+10, 5, roofHighlight);
      } else {
        // Variation/fill tiles
        hLine(grid, ox, ox+15, 7, roofHighlight);
        if (tx % 2 === 0) hLine(grid, ox, ox+15, 3, roofHighlight);
        if (tx % 2 === 1) hLine(grid, ox, ox+15, 11, roofHighlight);
      }
    }
  }

  // Row 1: Wall tiles (y 16–31)
  for (let tx = 0; tx < 16; tx++) {
    const ox = tx * 16, oy = 16;
    if (tx < 4) {
      // Solid wall variants
      fillRect(grid, ox, oy, ox+15, oy+15, wallColor);
      if (tx === 0) { // plain wall
        hLine(grid, ox, ox+15, oy, wallHighlight);
      } else if (tx === 1) { // wall with brick pattern
        for (let r = 0; r < 4; r++) {
          hLine(grid, ox, ox+15, oy + r*4, wallShadow);
          const off = (r % 2 === 0) ? 0 : 8;
          vLine(grid, ox + off, oy + r*4, oy + r*4 + 3, wallShadow);
          vLine(grid, ox + off + 8, oy + r*4, oy + r*4 + 3, wallShadow);
        }
      } else if (tx === 2) { // wall left edge
        vLine(grid, ox, oy, oy+15, trimColor);
        vLine(grid, ox+1, oy, oy+15, wallHighlight);
      } else { // wall right edge
        vLine(grid, ox+15, oy, oy+15, trimColor);
        vLine(grid, ox+14, oy, oy+15, wallShadow);
      }
    } else if (tx < 8) {
      // Wall with window opening / door frame
      fillRect(grid, ox, oy, ox+15, oy+15, wallColor);
      if (tx === 4) { // window opening (top half)
        fillRect(grid, ox+3, oy+2, ox+12, oy+12, P.skyBlue);
        drawRect(grid, ox+3, oy+2, ox+12, oy+12, trimColor);
        // Window cross
        vLine(grid, ox+7, oy+2, oy+12, trimColor);
        hLine(grid, ox+3, ox+12, oy+7, trimColor);
        setPixel(grid, ox+4, oy+3, P.highlight);
      } else if (tx === 5) { // door top
        fillRect(grid, ox+3, oy, ox+12, oy+15, P.richEarth);
        drawRect(grid, ox+3, oy, ox+12, oy+15, P.deepSoil);
        hLine(grid, ox+4, ox+11, oy+1, P.dirt);
        // Door arch
        setPixel(grid, ox+3, oy, trimColor);
        setPixel(grid, ox+12, oy, trimColor);
      } else if (tx === 6) { // door bottom
        fillRect(grid, ox+3, oy, ox+12, oy+15, P.richEarth);
        drawRect(grid, ox+3, oy, ox+12, oy+15, P.deepSoil);
        // Door handle
        setPixel(grid, ox+10, oy+6, P.gold);
        setPixel(grid, ox+10, oy+7, P.darkGold);
        // Door panels
        drawRect(grid, ox+5, oy+2, ox+7, oy+6, P.deepSoil);
        drawRect(grid, ox+8, oy+2, ox+10, oy+6, P.deepSoil);
        drawRect(grid, ox+5, oy+8, ox+10, oy+13, P.deepSoil);
      } else { // wall with torch sconce
        fillRect(grid, ox, oy, ox+15, oy+15, wallColor);
        // Sconce bracket
        fillRect(grid, ox+6, oy+4, ox+9, oy+8, P.stoneGray);
        drawRect(grid, ox+6, oy+4, ox+9, oy+8, P.darkRock);
        // Flame
        setPixel(grid, ox+7, oy+2, P.brightYellow);
        setPixel(grid, ox+8, oy+2, P.brightYellow);
        setPixel(grid, ox+7, oy+3, P.fireOrange);
        setPixel(grid, ox+8, oy+3, P.gold);
        setPixel(grid, ox+7, oy+1, P.ember);
      }
    } else {
      // Additional wall detail tiles
      fillRect(grid, ox, oy, ox+15, oy+15, wallColor);
      hLine(grid, ox, ox+15, oy, wallHighlight);
      hLine(grid, ox, ox+15, oy+15, wallShadow);
    }
  }

  // Row 2: Floor / foundation tiles (y 32–47)
  for (let tx = 0; tx < 16; tx++) {
    const ox = tx * 16, oy = 32;
    if (tx < 4) {
      fillRect(grid, ox, oy, ox+15, oy+15, floorColor);
      if (tx === 0) { // stone floor
        for (let r = 0; r < 4; r++)
          for (let c = 0; c < 4; c++) {
            drawRect(grid, ox + c*4, oy + r*4, ox + c*4+3, oy + r*4+3, floorAccent);
          }
      } else if (tx === 1) { // wood plank floor
        for (let p = 0; p < 4; p++) {
          hLine(grid, ox, ox+15, oy + p*4, floorAccent);
          setPixel(grid, ox + 3 + (p % 2) * 8, oy + p*4 + 2, floorAccent);
        }
      } else if (tx === 2) { // foundation stone
        fillRect(grid, ox, oy, ox+15, oy+15, P.stoneGray);
        drawRect(grid, ox, oy, ox+15, oy+15, P.darkRock);
        hLine(grid, ox, ox+15, oy+7, P.darkRock);
        vLine(grid, ox+7, oy, oy+7, P.darkRock);
        vLine(grid, ox+11, oy+7, oy+15, P.darkRock);
      } else { // grass/dirt transition
        fillRect(grid, ox, oy, ox+15, oy+7, floorColor);
        fillRect(grid, ox, oy+8, ox+15, oy+15, P.brightGrass);
        hLine(grid, ox, ox+15, oy+8, P.forestGreen);
        setPixel(grid, ox+3, oy+7, P.brightGrass);
        setPixel(grid, ox+10, oy+7, P.brightGrass);
      }
    } else {
      // More floor variants
      fillRect(grid, ox, oy, ox+15, oy+15, floorColor);
      if (tx % 3 === 0) {
        for (let i = 0; i < 4; i++) drawRect(grid, ox + i*4, oy + i*4, ox + i*4+3, oy + i*4+3, floorAccent);
      } else if (tx % 3 === 1) {
        hLine(grid, ox, ox+15, oy + 4, floorAccent);
        hLine(grid, ox, ox+15, oy + 11, floorAccent);
      } else {
        for (let i = 0; i < 8; i++) {
          setPixel(grid, ox + (i*5) % 16, oy + (i*3) % 16, floorAccent);
        }
      }
    }
  }

  // Row 3: Detail / trim tiles (y 48–63)
  for (let tx = 0; tx < 16; tx++) {
    const ox = tx * 16, oy = 48;
    if (tx === 0) { // baseboard/molding
      fillRect(grid, ox, oy, ox+15, oy+3, trimColor);
      hLine(grid, ox, ox+15, oy, wallHighlight);
      fillRect(grid, ox, oy+4, ox+15, oy+15, T);
    } else if (tx === 1) { // window sill
      fillRect(grid, ox, oy, ox+15, oy+3, P.paleGray);
      hLine(grid, ox, ox+15, oy, P.nearWhite);
      hLine(grid, ox, ox+15, oy+3, P.stoneGray);
      fillRect(grid, ox, oy+4, ox+15, oy+15, T);
    } else if (tx === 2) { // awning/canopy
      fillRect(grid, ox, oy, ox+15, oy+7, roofColor);
      for (let i = 0; i < 8; i++) setPixel(grid, ox + i*2, oy+8, roofColor);
      hLine(grid, ox, ox+15, oy, roofHighlight);
    } else if (tx === 3) { // flower box
      fillRect(grid, ox+2, oy+8, ox+13, oy+12, P.richEarth);
      drawRect(grid, ox+2, oy+8, ox+13, oy+12, P.deepSoil);
      // Flowers
      setPixel(grid, ox+4, oy+7, P.brightRed);
      setPixel(grid, ox+7, oy+6, P.brightYellow);
      setPixel(grid, ox+10, oy+7, P.playerBlue);
      setPixel(grid, ox+4, oy+8, P.leafGreen);
      setPixel(grid, ox+7, oy+7, P.leafGreen);
      setPixel(grid, ox+10, oy+8, P.leafGreen);
    } else if (tx === 4) { // sign board
      // Hanging sign
      hLine(grid, ox+2, ox+13, oy+2, P.stoneGray);
      vLine(grid, ox+4, oy+2, oy+4, P.midGray);
      vLine(grid, ox+11, oy+2, oy+4, P.midGray);
      fillRect(grid, ox+3, oy+4, ox+12, oy+10, P.desertGold);
      drawRect(grid, ox+3, oy+4, ox+12, oy+10, P.richEarth);
    } else {
      // Filler/pattern tiles
      fillRect(grid, ox, oy, ox+15, oy+15, T);
    }
  }

  save(w, h, grid, path.join(OUT, `tileset_house_${name}.png`));
}

// Small house (cottage) — warm earth tones, thatch roof
drawHouseTileset('small',
  P.desertGold, P.paleSand,      // roof
  P.paleSand, P.nearWhite, P.sand, // wall
  P.richEarth,                    // trim
  P.dirt, P.richEarth             // floor
);

// Medium house (manor) — stone walls, slate roof
drawHouseTileset('medium',
  P.stoneGray, P.midGray,         // roof
  P.paleGray, P.nearWhite, P.midGray, // wall
  P.darkRock,                      // trim
  P.lightStone, P.stoneGray       // floor
);

// Large house (estate) — rich materials, dark roof
drawHouseTileset('large',
  P.deepSoil, P.richEarth,        // roof
  P.nearWhite, P.highlight, P.paleGray, // wall
  P.darkGold,                      // trim
  P.desertGold, P.sand            // floor
);

// Interior tileset — wood floors, wallpaper walls
drawHouseTileset('interior',
  P.paleGray, P.nearWhite,        // ceiling/upper
  P.paleSand, P.nearWhite, P.desertGold, // wall
  P.dirt,                          // trim/baseboard
  P.richEarth, P.deepSoil         // wood floor
);

// ========================================================================
// 2. FURNITURE SPRITES (16×16 each)
// ========================================================================
console.log('\n=== Furniture Sprites (16×16) ===');

function saveFurn(name, drawFn) {
  const grid = makeGrid(16, 16);
  drawFn(grid);
  save(16, 16, grid, path.join(OUT, `sprite_furn_${name}.png`));
}

saveFurn('table', (g) => {
  // Wooden table top (wide)
  fillRect(g, 1, 5, 14, 7, P.dirt);
  hLine(g, 1, 14, 5, P.sand);
  hLine(g, 1, 14, 7, P.richEarth);
  drawRect(g, 1, 5, 14, 7, P.deepSoil);
  // Legs
  vLine(g, 2, 8, 14, P.richEarth); vLine(g, 3, 8, 14, P.dirt);
  vLine(g, 12, 8, 14, P.richEarth); vLine(g, 13, 8, 14, P.dirt);
  // Shadow
  hLine(g, 2, 13, 15, P.deepSoil);
});

saveFurn('chair', (g) => {
  // Chair back
  fillRect(g, 3, 1, 8, 6, P.dirt);
  drawRect(g, 3, 1, 8, 6, P.deepSoil);
  vLine(g, 5, 2, 5, P.richEarth);
  vLine(g, 7, 2, 5, P.richEarth);
  // Seat
  fillRect(g, 2, 7, 9, 9, P.sand);
  drawRect(g, 2, 7, 9, 9, P.richEarth);
  hLine(g, 2, 9, 7, P.desertGold);
  // Legs
  vLine(g, 3, 10, 14, P.richEarth);
  vLine(g, 8, 10, 14, P.richEarth);
  hLine(g, 3, 8, 15, P.deepSoil);
});

saveFurn('bed', (g) => {
  // Headboard
  fillRect(g, 0, 2, 3, 10, P.richEarth);
  drawRect(g, 0, 2, 3, 10, P.deepSoil);
  hLine(g, 0, 3, 2, P.dirt);
  // Mattress
  fillRect(g, 4, 4, 15, 10, P.nearWhite);
  drawRect(g, 4, 4, 15, 10, P.paleGray);
  // Pillow
  fillRect(g, 4, 5, 6, 9, P.paleWater);
  drawRect(g, 4, 5, 6, 9, P.skyBlue);
  // Blanket
  fillRect(g, 7, 6, 14, 9, P.playerBlue);
  hLine(g, 7, 14, 6, P.skyBlue);
  hLine(g, 7, 14, 9, P.oceanBlue);
  // Legs
  fillRect(g, 0, 11, 15, 12, P.richEarth);
  hLine(g, 0, 15, 13, P.deepSoil);
});

saveFurn('shelf', (g) => {
  // Back panel
  fillRect(g, 1, 1, 14, 14, P.dirt);
  drawRect(g, 1, 1, 14, 14, P.deepSoil);
  // Shelves
  hLine(g, 1, 14, 5, P.richEarth);
  hLine(g, 1, 14, 10, P.richEarth);
  // Items on shelves
  fillRect(g, 3, 2, 5, 4, P.leafGreen);   // book
  fillRect(g, 7, 3, 8, 4, P.brightRed);   // potion
  fillRect(g, 10, 2, 12, 4, P.playerBlue); // jar
  fillRect(g, 3, 7, 5, 9, P.gold);        // trophy
  fillRect(g, 8, 6, 9, 9, P.desertGold);  // scroll
  fillRect(g, 11, 7, 13, 9, P.manaViolet); // crystal
  setPixel(g, 6, 11, P.brightYellow);      // gem
  fillRect(g, 8, 11, 10, 13, P.sand);     // box
});

saveFurn('rug', (g) => {
  // Oval rug shape
  fillRect(g, 2, 4, 13, 11, P.deepBlood);
  hLine(g, 3, 12, 3, P.deepBlood);
  hLine(g, 3, 12, 12, P.deepBlood);
  // Border pattern
  drawRect(g, 3, 5, 12, 10, P.gold);
  // Center diamond
  setPixel(g, 7, 7, P.brightYellow);
  setPixel(g, 8, 7, P.brightYellow);
  setPixel(g, 7, 8, P.brightYellow);
  setPixel(g, 8, 8, P.brightYellow);
  setPixel(g, 6, 7, P.gold); setPixel(g, 9, 8, P.gold);
  setPixel(g, 7, 6, P.gold); setPixel(g, 8, 9, P.gold);
});

saveFurn('lamp', (g) => {
  // Base
  fillRect(g, 5, 13, 10, 14, P.stoneGray);
  hLine(g, 5, 10, 15, P.darkRock);
  // Pole
  vLine(g, 7, 5, 12, P.midGray);
  vLine(g, 8, 5, 12, P.stoneGray);
  // Shade
  fillRect(g, 3, 3, 12, 5, P.paleSand);
  drawRect(g, 3, 3, 12, 5, P.sand);
  hLine(g, 4, 11, 2, P.desertGold);
  // Glow
  setPixel(g, 7, 4, P.brightYellow);
  setPixel(g, 8, 4, P.brightYellow);
  setPixel(g, 6, 4, P.gold);
  setPixel(g, 9, 4, P.gold);
});

saveFurn('fireplace', (g) => {
  // Stone surround
  fillRect(g, 0, 0, 15, 15, P.stoneGray);
  drawRect(g, 0, 0, 15, 15, P.darkRock);
  // Mantel
  fillRect(g, 0, 0, 15, 2, P.midGray);
  hLine(g, 0, 15, 0, P.lightStone);
  // Fire opening
  fillRect(g, 3, 4, 12, 14, P.black);
  drawRect(g, 3, 3, 12, 14, P.darkRock);
  // Flames
  setPixel(g, 6, 10, P.brightYellow); setPixel(g, 9, 10, P.brightYellow);
  setPixel(g, 7, 9, P.gold);  setPixel(g, 8, 9, P.gold);
  setPixel(g, 5, 11, P.fireOrange); setPixel(g, 10, 11, P.fireOrange);
  setPixel(g, 7, 8, P.ember); setPixel(g, 8, 8, P.ember);
  setPixel(g, 6, 12, P.brightRed); setPixel(g, 9, 12, P.brightRed);
  // Embers
  fillRect(g, 4, 13, 11, 14, P.deepBlood);
  setPixel(g, 5, 13, P.fireOrange); setPixel(g, 10, 13, P.ember);
  // Mantel decorations
  setPixel(g, 2, 1, P.leafGreen); // small plant
  setPixel(g, 13, 1, P.gold);     // candle
});

saveFurn('chest', (g) => {
  // Chest body
  fillRect(g, 2, 6, 13, 13, P.richEarth);
  drawRect(g, 2, 6, 13, 13, P.deepSoil);
  // Lid (slightly raised)
  fillRect(g, 1, 3, 14, 6, P.dirt);
  drawRect(g, 1, 3, 14, 6, P.deepSoil);
  hLine(g, 1, 14, 3, P.sand);
  // Metal bands
  hLine(g, 2, 13, 8, P.stoneGray);
  hLine(g, 2, 13, 11, P.stoneGray);
  // Lock
  fillRect(g, 6, 5, 9, 8, P.gold);
  drawRect(g, 6, 5, 9, 8, P.darkGold);
  setPixel(g, 7, 7, P.darkGold); // keyhole
  // Shadow
  hLine(g, 2, 13, 14, P.deepSoil);
});

// ========================================================================
// 3. DECORATION SPRITES (16×16 each)
// ========================================================================
console.log('\n=== Decoration Sprites (16×16) ===');

function saveDecor(name, drawFn) {
  const grid = makeGrid(16, 16);
  drawFn(grid);
  save(16, 16, grid, path.join(OUT, `sprite_decor_${name}.png`));
}

saveDecor('painting', (g) => {
  // Frame
  fillRect(g, 2, 2, 13, 12, P.darkGold);
  drawRect(g, 2, 2, 13, 12, P.deepSoil);
  hLine(g, 2, 13, 2, P.gold);
  // Canvas
  fillRect(g, 4, 4, 11, 10, P.skyBlue);
  // Mountain landscape
  fillRect(g, 4, 8, 11, 10, P.forestGreen);
  setPixel(g, 6, 6, P.paleGray); setPixel(g, 7, 5, P.nearWhite);
  setPixel(g, 8, 6, P.paleGray); // mountain peak
  setPixel(g, 9, 7, P.lightStone);
  // Sun
  setPixel(g, 10, 4, P.brightYellow);
});

saveDecor('plant', (g) => {
  // Pot
  fillRect(g, 4, 10, 11, 14, P.richEarth);
  drawRect(g, 4, 10, 11, 14, P.deepSoil);
  hLine(g, 3, 12, 10, P.dirt);
  // Soil
  hLine(g, 5, 10, 11, P.deepSoil);
  // Leaves
  setPixel(g, 7, 8, P.forestGreen); setPixel(g, 8, 8, P.forestGreen);
  setPixel(g, 6, 7, P.leafGreen); setPixel(g, 9, 7, P.leafGreen);
  setPixel(g, 5, 6, P.brightGrass); setPixel(g, 10, 6, P.brightGrass);
  setPixel(g, 7, 5, P.leafGreen); setPixel(g, 8, 5, P.leafGreen);
  setPixel(g, 6, 4, P.brightGrass); setPixel(g, 9, 4, P.brightGrass);
  setPixel(g, 7, 3, P.lightFoliage);
  setPixel(g, 8, 9, P.forestGreen); // stem
  setPixel(g, 7, 9, P.forestGreen);
});

saveDecor('candles', (g) => {
  // Candelabra base
  fillRect(g, 5, 12, 10, 14, P.darkGold);
  hLine(g, 5, 10, 15, P.deepSoil);
  // Center post
  vLine(g, 7, 7, 12, P.gold);
  vLine(g, 8, 7, 12, P.gold);
  // Left arm
  hLine(g, 3, 7, 7, P.gold);
  vLine(g, 3, 4, 7, P.paleHighlight);
  // Right arm
  hLine(g, 8, 12, 7, P.gold);
  vLine(g, 12, 4, 7, P.paleHighlight);
  // Center candle
  vLine(g, 7, 4, 7, P.paleHighlight); vLine(g, 8, 4, 7, P.paleHighlight);
  // Flames
  setPixel(g, 3, 3, P.brightYellow);  setPixel(g, 3, 2, P.ember);
  setPixel(g, 7, 3, P.brightYellow);  setPixel(g, 8, 3, P.gold);
  setPixel(g, 7, 2, P.ember);
  setPixel(g, 12, 3, P.brightYellow); setPixel(g, 12, 2, P.ember);
});

saveDecor('trophy', (g) => {
  // Cup body
  fillRect(g, 4, 3, 11, 8, P.gold);
  drawRect(g, 4, 3, 11, 8, P.darkGold);
  hLine(g, 5, 10, 3, P.brightYellow);
  // Handles
  setPixel(g, 3, 4, P.gold); setPixel(g, 3, 5, P.gold);
  setPixel(g, 12, 4, P.gold); setPixel(g, 12, 5, P.gold);
  // Stem
  fillRect(g, 6, 9, 9, 11, P.darkGold);
  // Base
  fillRect(g, 4, 12, 11, 13, P.gold);
  drawRect(g, 4, 12, 11, 13, P.darkGold);
  hLine(g, 4, 11, 12, P.brightYellow);
  // Star detail
  setPixel(g, 7, 5, P.brightYellow);
  setPixel(g, 8, 5, P.brightYellow);
  setPixel(g, 7, 6, P.paleHighlight);
  setPixel(g, 8, 6, P.paleHighlight);
});

saveDecor('banner', (g) => {
  // Rod at top
  hLine(g, 2, 13, 1, P.stoneGray);
  setPixel(g, 1, 1, P.midGray); setPixel(g, 14, 1, P.midGray);
  // Banner cloth
  fillRect(g, 3, 2, 12, 13, P.deepBlood);
  drawRect(g, 3, 2, 12, 13, P.enemyRed);
  // Pointed bottom
  setPixel(g, 3, 13, T); setPixel(g, 12, 13, T);
  setPixel(g, 3, 12, T); setPixel(g, 12, 12, T);
  setPixel(g, 4, 13, T); setPixel(g, 11, 13, T);
  // Emblem (simple shield)
  fillRect(g, 6, 5, 9, 9, P.gold);
  drawRect(g, 6, 5, 9, 9, P.darkGold);
  setPixel(g, 7, 7, P.brightYellow);
  setPixel(g, 8, 7, P.brightYellow);
});

saveDecor('pet_bed', (g) => {
  // Bed rim (oval)
  fillRect(g, 2, 6, 13, 13, P.richEarth);
  drawRect(g, 2, 6, 13, 13, P.deepSoil);
  hLine(g, 3, 12, 5, P.dirt);
  hLine(g, 3, 12, 14, P.deepSoil);
  // Cushion
  fillRect(g, 4, 8, 11, 12, P.playerBlue);
  drawRect(g, 4, 8, 11, 12, P.oceanBlue);
  hLine(g, 4, 11, 8, P.skyBlue);
  // Paw print detail
  setPixel(g, 7, 10, P.skyBlue);
  setPixel(g, 8, 10, P.skyBlue);
  setPixel(g, 6, 9, P.paleWater);
  setPixel(g, 9, 9, P.paleWater);
});

// ========================================================================
// 4. YARD / GARDEN SPRITES (16×16 each)
// ========================================================================
console.log('\n=== Yard / Garden Sprites (16×16) ===');

function saveYard(name, drawFn) {
  const grid = makeGrid(16, 16);
  drawFn(grid);
  save(16, 16, grid, path.join(OUT, `sprite_yard_${name}.png`));
}

saveYard('fence', (g) => {
  // Horizontal fence section
  hLine(g, 0, 15, 4, P.sand);
  hLine(g, 0, 15, 5, P.desertGold);
  hLine(g, 0, 15, 10, P.sand);
  hLine(g, 0, 15, 11, P.desertGold);
  // Posts
  fillRect(g, 0, 2, 2, 14, P.dirt);
  drawRect(g, 0, 2, 2, 14, P.richEarth);
  setPixel(g, 1, 2, P.sand);
  fillRect(g, 13, 2, 15, 14, P.dirt);
  drawRect(g, 13, 2, 15, 14, P.richEarth);
  setPixel(g, 14, 2, P.sand);
});

saveYard('fence_corner', (g) => {
  // Corner post
  fillRect(g, 5, 2, 10, 14, P.dirt);
  drawRect(g, 5, 2, 10, 14, P.richEarth);
  setPixel(g, 7, 2, P.sand); setPixel(g, 8, 2, P.sand);
  // Rails going right
  hLine(g, 10, 15, 5, P.sand); hLine(g, 10, 15, 11, P.sand);
  // Rails going down
  vLine(g, 7, 14, 15, P.sand); vLine(g, 8, 14, 15, P.sand);
});

saveYard('garden_bed', (g) => {
  // Soil bed
  fillRect(g, 1, 7, 14, 14, P.deepSoil);
  drawRect(g, 1, 7, 14, 14, P.deepForest);
  // Soil rows
  hLine(g, 2, 13, 9, P.richEarth);
  hLine(g, 2, 13, 12, P.richEarth);
  // Plants growing
  setPixel(g, 3, 6, P.leafGreen); setPixel(g, 3, 7, P.forestGreen);
  setPixel(g, 6, 5, P.brightGrass); setPixel(g, 6, 6, P.leafGreen);
  setPixel(g, 9, 6, P.lightFoliage); setPixel(g, 9, 7, P.leafGreen);
  setPixel(g, 12, 5, P.brightGrass); setPixel(g, 12, 6, P.forestGreen);
  // Small flowers
  setPixel(g, 4, 10, P.brightRed);
  setPixel(g, 8, 11, P.brightYellow);
  setPixel(g, 11, 10, P.manaViolet);
});

saveYard('flowerpot', (g) => {
  // Pot
  fillRect(g, 4, 9, 11, 14, P.richEarth);
  drawRect(g, 4, 9, 11, 14, P.deepSoil);
  hLine(g, 3, 12, 9, P.dirt); // rim
  // Soil
  fillRect(g, 5, 10, 10, 10, P.deepSoil);
  // Flower stems
  vLine(g, 6, 5, 9, P.forestGreen);
  vLine(g, 9, 4, 9, P.forestGreen);
  // Flowers
  setPixel(g, 5, 4, P.brightRed); setPixel(g, 6, 3, P.brightRed);
  setPixel(g, 7, 4, P.brightRed); setPixel(g, 6, 4, P.brightYellow);
  setPixel(g, 8, 3, P.manaViolet); setPixel(g, 9, 2, P.manaViolet);
  setPixel(g, 10, 3, P.manaViolet); setPixel(g, 9, 3, P.spellGlow);
});

saveYard('well', (g) => {
  // Stone base (circular-ish)
  fillRect(g, 3, 8, 12, 14, P.stoneGray);
  drawRect(g, 3, 8, 12, 14, P.darkRock);
  hLine(g, 4, 11, 7, P.midGray);
  // Water inside
  fillRect(g, 5, 9, 10, 13, P.oceanBlue);
  setPixel(g, 7, 10, P.skyBlue); setPixel(g, 8, 11, P.playerBlue);
  // Roof supports
  vLine(g, 4, 2, 7, P.richEarth);
  vLine(g, 11, 2, 7, P.richEarth);
  // Roof
  fillRect(g, 2, 1, 13, 3, P.dirt);
  drawRect(g, 2, 1, 13, 3, P.deepSoil);
  hLine(g, 3, 12, 0, P.sand);
  // Rope & bucket
  vLine(g, 7, 4, 6, P.sand);
  setPixel(g, 7, 7, P.stoneGray);
});

saveYard('lantern', (g) => {
  // Pole
  vLine(g, 7, 6, 14, P.stoneGray);
  vLine(g, 8, 6, 14, P.midGray);
  // Base
  fillRect(g, 5, 14, 10, 15, P.darkRock);
  // Lantern housing
  fillRect(g, 5, 2, 10, 6, P.stoneGray);
  drawRect(g, 5, 2, 10, 6, P.darkRock);
  // Glass/glow
  fillRect(g, 6, 3, 9, 5, P.brightYellow);
  setPixel(g, 7, 4, P.paleHighlight);
  setPixel(g, 8, 4, P.paleHighlight);
  // Top cap
  hLine(g, 6, 9, 1, P.midGray);
  setPixel(g, 7, 0, P.darkRock); setPixel(g, 8, 0, P.darkRock);
});

saveYard('bench', (g) => {
  // Seat
  fillRect(g, 1, 7, 14, 9, P.dirt);
  hLine(g, 1, 14, 7, P.sand);
  hLine(g, 1, 14, 9, P.richEarth);
  // Back rest
  fillRect(g, 1, 3, 14, 5, P.dirt);
  hLine(g, 1, 14, 3, P.sand);
  drawRect(g, 1, 3, 14, 5, P.richEarth);
  // Legs
  vLine(g, 2, 10, 14, P.richEarth);
  vLine(g, 13, 10, 14, P.richEarth);
  // Arm rests
  fillRect(g, 1, 4, 2, 9, P.richEarth);
  fillRect(g, 13, 4, 14, 9, P.richEarth);
  hLine(g, 2, 13, 15, P.deepSoil);
});

saveYard('birdbath', (g) => {
  // Basin
  fillRect(g, 3, 5, 12, 7, P.lightStone);
  drawRect(g, 3, 5, 12, 7, P.stoneGray);
  hLine(g, 4, 11, 5, P.paleGray);
  // Water
  hLine(g, 4, 11, 6, P.playerBlue);
  setPixel(g, 7, 6, P.paleWater);
  // Pedestal
  fillRect(g, 5, 8, 10, 13, P.lightStone);
  drawRect(g, 5, 8, 10, 13, P.stoneGray);
  // Base
  fillRect(g, 4, 13, 11, 14, P.stoneGray);
  hLine(g, 4, 11, 15, P.darkRock);
  // Bird
  setPixel(g, 9, 4, P.brightRed);
  setPixel(g, 10, 4, P.brightRed);
  setPixel(g, 11, 4, P.brightYellow); // beak
  setPixel(g, 10, 3, P.enemyRed); // head
});

saveYard('stepping_stone', (g) => {
  // Three stepping stones in a path
  fillRect(g, 1, 2, 5, 5, P.lightStone);
  drawRect(g, 1, 2, 5, 5, P.stoneGray);
  setPixel(g, 2, 3, P.paleGray);

  fillRect(g, 6, 6, 10, 9, P.lightStone);
  drawRect(g, 6, 6, 10, 9, P.stoneGray);
  setPixel(g, 7, 7, P.paleGray);

  fillRect(g, 10, 11, 14, 14, P.lightStone);
  drawRect(g, 10, 11, 14, 14, P.stoneGray);
  setPixel(g, 11, 12, P.paleGray);
});

saveYard('tree', (g) => {
  // Trunk
  fillRect(g, 6, 9, 9, 14, P.richEarth);
  vLine(g, 7, 9, 14, P.dirt);
  drawRect(g, 6, 9, 9, 14, P.deepSoil);
  // Canopy (round, lush)
  fillRect(g, 2, 2, 13, 9, P.forestGreen);
  hLine(g, 3, 12, 1, P.forestGreen);
  hLine(g, 4, 11, 0, P.leafGreen);
  fillRect(g, 1, 4, 14, 7, P.forestGreen);
  // Highlights
  fillRect(g, 4, 2, 8, 4, P.leafGreen);
  setPixel(g, 5, 2, P.brightGrass);
  setPixel(g, 6, 3, P.brightGrass);
  setPixel(g, 10, 4, P.leafGreen);
  // Shadow underneath
  hLine(g, 3, 12, 9, P.deepForest);
  // Ground shadow
  hLine(g, 5, 10, 15, P.deepSoil);
});

// ========================================================================
// 5. DOOR & WINDOW VARIANTS (16×16 each)
// ========================================================================
console.log('\n=== Door & Window Variants (16×16) ===');

function saveDoor(name, drawFn) {
  const grid = makeGrid(16, 16);
  drawFn(grid);
  save(16, 16, grid, path.join(OUT, `sprite_door_${name}.png`));
}

function saveWindow(name, drawFn) {
  const grid = makeGrid(16, 16);
  drawFn(grid);
  save(16, 16, grid, path.join(OUT, `sprite_window_${name}.png`));
}

saveDoor('wood', (g) => {
  // Simple wooden door
  fillRect(g, 3, 0, 12, 15, P.richEarth);
  drawRect(g, 3, 0, 12, 15, P.deepSoil);
  hLine(g, 4, 11, 1, P.dirt);
  // Planks
  vLine(g, 6, 1, 14, P.deepSoil);
  vLine(g, 9, 1, 14, P.deepSoil);
  // Handle
  setPixel(g, 10, 8, P.gold);
  setPixel(g, 10, 9, P.darkGold);
  // Hinges
  fillRect(g, 3, 3, 4, 4, P.stoneGray);
  fillRect(g, 3, 11, 4, 12, P.stoneGray);
  // Frame
  vLine(g, 2, 0, 15, P.dirt);
  vLine(g, 13, 0, 15, P.dirt);
  hLine(g, 2, 13, 0, P.sand);
});

saveDoor('iron', (g) => {
  // Iron reinforced door
  fillRect(g, 3, 0, 12, 15, P.stoneGray);
  drawRect(g, 3, 0, 12, 15, P.darkRock);
  hLine(g, 4, 11, 1, P.midGray);
  // Metal bands
  hLine(g, 3, 12, 4, P.darkRock);
  hLine(g, 3, 12, 8, P.darkRock);
  hLine(g, 3, 12, 12, P.darkRock);
  // Rivets
  setPixel(g, 5, 4, P.lightStone); setPixel(g, 10, 4, P.lightStone);
  setPixel(g, 5, 8, P.lightStone); setPixel(g, 10, 8, P.lightStone);
  setPixel(g, 5, 12, P.lightStone); setPixel(g, 10, 12, P.lightStone);
  // Handle ring
  fillRect(g, 9, 7, 11, 9, P.midGray);
  setPixel(g, 10, 8, P.darkRock);
  // Frame
  vLine(g, 2, 0, 15, P.darkRock);
  vLine(g, 13, 0, 15, P.darkRock);
  hLine(g, 2, 13, 0, P.midGray);
});

saveDoor('ornate', (g) => {
  // Ornate gilded door
  fillRect(g, 3, 0, 12, 15, P.dirt);
  drawRect(g, 3, 0, 12, 15, P.deepSoil);
  // Arch at top
  setPixel(g, 3, 0, T); setPixel(g, 12, 0, T);
  setPixel(g, 4, 0, P.gold); setPixel(g, 11, 0, P.gold);
  hLine(g, 4, 11, 0, P.gold);
  hLine(g, 3, 12, 1, P.darkGold);
  // Door panels with gold trim
  drawRect(g, 5, 3, 10, 7, P.gold);
  drawRect(g, 5, 9, 10, 13, P.gold);
  // Panel fill
  fillRect(g, 6, 4, 9, 6, P.sand);
  fillRect(g, 6, 10, 9, 12, P.sand);
  // Handle (ornate)
  setPixel(g, 10, 8, P.brightYellow);
  setPixel(g, 11, 8, P.gold);
  // Frame gilt
  vLine(g, 2, 0, 15, P.gold);
  vLine(g, 13, 0, 15, P.gold);
  setPixel(g, 2, 0, P.brightYellow); setPixel(g, 13, 0, P.brightYellow);
});

saveWindow('small', (g) => {
  // Simple small window
  fillRect(g, 3, 3, 12, 12, P.skyBlue);
  drawRect(g, 3, 3, 12, 12, P.deepSoil);
  // Frame
  drawRect(g, 2, 2, 13, 13, P.dirt);
  hLine(g, 2, 13, 2, P.sand);
  // Cross bars
  vLine(g, 7, 3, 12, P.dirt);
  hLine(g, 3, 12, 7, P.dirt);
  // Glass highlight
  setPixel(g, 4, 4, P.highlight);
  setPixel(g, 5, 4, P.paleWater);
  setPixel(g, 4, 5, P.paleWater);
  // Sill
  fillRect(g, 2, 13, 13, 14, P.paleGray);
  hLine(g, 2, 13, 13, P.nearWhite);
});

saveWindow('arched', (g) => {
  // Arched window
  fillRect(g, 3, 5, 12, 13, P.skyBlue);
  drawRect(g, 3, 5, 12, 13, P.stoneGray);
  // Arch top
  hLine(g, 5, 10, 2, P.stoneGray);
  hLine(g, 4, 11, 3, P.stoneGray);
  hLine(g, 3, 12, 4, P.stoneGray);
  // Fill arch interior
  hLine(g, 5, 10, 3, P.skyBlue);
  hLine(g, 4, 11, 4, P.skyBlue);
  // Keystone
  setPixel(g, 7, 2, P.paleGray); setPixel(g, 8, 2, P.paleGray);
  // Mullion
  vLine(g, 7, 3, 13, P.stoneGray);
  // Glass highlight
  setPixel(g, 5, 5, P.highlight);
  setPixel(g, 5, 6, P.paleWater);
  setPixel(g, 6, 5, P.paleWater);
  // Sill
  fillRect(g, 2, 13, 13, 14, P.lightStone);
  hLine(g, 2, 13, 13, P.paleGray);
});

saveWindow('shuttered', (g) => {
  // Window with shutters
  // Left shutter
  fillRect(g, 1, 3, 4, 12, P.forestGreen);
  drawRect(g, 1, 3, 4, 12, P.deepForest);
  hLine(g, 2, 3, 5, P.leafGreen);
  hLine(g, 2, 3, 9, P.leafGreen);
  // Right shutter
  fillRect(g, 11, 3, 14, 12, P.forestGreen);
  drawRect(g, 11, 3, 14, 12, P.deepForest);
  hLine(g, 12, 13, 5, P.leafGreen);
  hLine(g, 12, 13, 9, P.leafGreen);
  // Window center
  fillRect(g, 5, 3, 10, 12, P.skyBlue);
  drawRect(g, 5, 3, 10, 12, P.richEarth);
  // Cross
  vLine(g, 7, 3, 12, P.dirt);
  hLine(g, 5, 10, 7, P.dirt);
  // Glass highlight
  setPixel(g, 6, 4, P.highlight);
  setPixel(g, 6, 5, P.paleWater);
  // Sill
  fillRect(g, 1, 12, 14, 13, P.paleGray);
  hLine(g, 1, 14, 12, P.nearWhite);
  // Shutter hardware
  setPixel(g, 4, 7, P.stoneGray); setPixel(g, 11, 7, P.stoneGray);
});

// ========================================================================
// 6. PLACEMENT UI (16×16 each)
// ========================================================================
console.log('\n=== Placement UI Overlays (16×16) ===');

function saveUI(name, drawFn, w = 16, h = 16) {
  const grid = makeGrid(w, h);
  drawFn(grid);
  save(w, h, grid, path.join(OUT, `ui_${name}.png`));
}

saveUI('grid_overlay', (g) => {
  // Dashed grid cell outline — semi-transparent feel via sparse pixels
  drawRect(g, 0, 0, 15, 15, P.nearWhite);
  // Make it dashed by removing alternating edge pixels
  for (let i = 0; i < 16; i += 2) {
    g[0][i] = T; g[15][i] = T;
    g[i][0] = T; g[i][15] = T;
  }
  // Corner dots (always visible)
  setPixel(g, 0, 0, P.nearWhite);
  setPixel(g, 15, 0, P.nearWhite);
  setPixel(g, 0, 15, P.nearWhite);
  setPixel(g, 15, 15, P.nearWhite);
});

saveUI('snap_indicator', (g) => {
  // Crosshair snap point
  // Horizontal
  hLine(g, 4, 11, 7, P.brightYellow);
  hLine(g, 4, 11, 8, P.brightYellow);
  // Vertical
  vLine(g, 7, 4, 11, P.brightYellow);
  vLine(g, 8, 4, 11, P.brightYellow);
  // Center bright
  fillRect(g, 6, 6, 9, 9, P.paleHighlight);
  fillRect(g, 7, 7, 8, 8, P.nearWhite);
  // Corner brackets
  hLine(g, 0, 3, 0, P.gold); vLine(g, 0, 0, 3, P.gold);
  hLine(g, 12, 15, 0, P.gold); vLine(g, 15, 0, 3, P.gold);
  hLine(g, 0, 3, 15, P.gold); vLine(g, 0, 12, 15, P.gold);
  hLine(g, 12, 15, 15, P.gold); vLine(g, 15, 12, 15, P.gold);
});

saveUI('grid_valid', (g) => {
  // Green translucent overlay for valid placement
  fillRect(g, 0, 0, 15, 15, P.leafGreen);
  drawRect(g, 0, 0, 15, 15, P.forestGreen);
  // Checkmark in center
  setPixel(g, 5, 8, P.nearWhite);
  setPixel(g, 6, 9, P.nearWhite);
  setPixel(g, 7, 10, P.nearWhite);
  setPixel(g, 8, 9, P.nearWhite);
  setPixel(g, 9, 8, P.nearWhite);
  setPixel(g, 10, 7, P.nearWhite);
  setPixel(g, 11, 6, P.nearWhite);
});

saveUI('grid_invalid', (g) => {
  // Red overlay for invalid placement
  fillRect(g, 0, 0, 15, 15, P.enemyRed);
  drawRect(g, 0, 0, 15, 15, P.deepBlood);
  // X mark in center
  for (let i = 0; i < 8; i++) {
    setPixel(g, 4+i, 4+i, P.nearWhite);
    setPixel(g, 11-i, 4+i, P.nearWhite);
  }
});

// ========================================================================
// 7. HOUSING MENU UI PANELS
// ========================================================================
console.log('\n=== Housing Menu UI Panels ===');

// Furniture Inventory panel (220×180)
saveUI('panel_housing_inventory', (g) => {
  // Panel background
  fillRect(g, 0, 0, 219, 179, P.deepOcean);
  drawRect(g, 0, 0, 219, 179, P.oceanBlue);
  drawRect(g, 1, 1, 218, 178, P.skyBlue);
  // Title bar
  fillRect(g, 2, 2, 217, 16, P.oceanBlue);
  hLine(g, 2, 217, 2, P.skyBlue);
  // "FURNITURE" text area
  fillRect(g, 8, 5, 80, 13, P.playerBlue);
  // Close button
  fillRect(g, 204, 4, 214, 14, P.enemyRed);
  drawRect(g, 204, 4, 214, 14, P.deepBlood);
  // X on close button
  for (let i = 0; i < 7; i++) {
    setPixel(g, 206+i, 6+i, P.nearWhite);
    setPixel(g, 212-i, 6+i, P.nearWhite);
  }
  // Category tabs
  for (let t = 0; t < 4; t++) {
    const tx = 8 + t * 52;
    fillRect(g, tx, 20, tx+48, 32, P.oceanBlue);
    drawRect(g, tx, 20, tx+48, 32, P.skyBlue);
    if (t === 0) fillRect(g, tx+1, 21, tx+47, 31, P.playerBlue);
  }
  // Item grid (5×6 grid of 18×18 slots)
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      const sx = 10 + col * 40;
      const sy = 38 + row * 22;
      fillRect(g, sx, sy, sx+17, sy+17, P.deepOcean);
      drawRect(g, sx, sy, sx+17, sy+17, P.stoneGray);
      if (row < 2) { // Show some sample items
        fillRect(g, sx+2, sy+2, sx+15, sy+15, P.darkRock);
        setPixel(g, sx+8, sy+8, P.sand);
      }
    }
  }
  // Preview area (right side)
  fillRect(g, 140, 38, 215, 105, P.deepOcean);
  drawRect(g, 140, 38, 215, 105, P.stoneGray);
  // Preview label area
  fillRect(g, 140, 108, 215, 118, P.oceanBlue);
  // Stats area
  fillRect(g, 140, 122, 215, 170, P.deepOcean);
  drawRect(g, 140, 122, 215, 170, P.stoneGray);
  // Place button
  fillRect(g, 150, 155, 205, 167, P.forestGreen);
  drawRect(g, 150, 155, 205, 167, P.deepForest);
  hLine(g, 150, 205, 155, P.leafGreen);
}, 220, 180);

// Placement Mode HUD (160×120)
saveUI('panel_housing_placement', (g) => {
  // Semi-transparent dark panel
  fillRect(g, 0, 0, 159, 119, P.deepOcean);
  drawRect(g, 0, 0, 159, 119, P.oceanBlue);
  drawRect(g, 1, 1, 158, 118, P.skyBlue);
  // Title
  fillRect(g, 2, 2, 157, 14, P.oceanBlue);
  hLine(g, 2, 157, 2, P.skyBlue);
  fillRect(g, 8, 4, 70, 12, P.playerBlue);
  // Preview of selected item
  fillRect(g, 8, 20, 55, 67, P.darkRock);
  drawRect(g, 8, 20, 55, 67, P.stoneGray);
  // Rotation controls
  for (let i = 0; i < 4; i++) {
    const bx = 64 + i * 22;
    fillRect(g, bx, 20, bx+18, 38, P.oceanBlue);
    drawRect(g, bx, 20, bx+18, 38, P.skyBlue);
  }
  // Grid snap toggle
  fillRect(g, 64, 44, 148, 56, P.oceanBlue);
  drawRect(g, 64, 44, 148, 56, P.skyBlue);
  // Grid snap indicator (green dot = on)
  fillRect(g, 136, 47, 144, 53, P.leafGreen);
  // Confirm / Cancel buttons
  fillRect(g, 8, 98, 74, 112, P.forestGreen);
  drawRect(g, 8, 98, 74, 112, P.deepForest);
  hLine(g, 8, 74, 98, P.leafGreen);
  fillRect(g, 82, 98, 148, 112, P.enemyRed);
  drawRect(g, 82, 98, 148, 112, P.deepBlood);
  hLine(g, 82, 148, 98, P.brightRed);
  // Position readout
  fillRect(g, 8, 72, 148, 84, P.black);
  drawRect(g, 8, 72, 148, 84, P.stoneGray);
  // Cost display
  fillRect(g, 8, 88, 148, 96, P.deepOcean);
  drawRect(g, 8, 88, 148, 96, P.stoneGray);
  setPixel(g, 12, 91, P.gold); setPixel(g, 13, 91, P.gold); // coin icon
}, 160, 120);

// Storage Panel (220×180)
saveUI('panel_housing_storage', (g) => {
  // Panel background
  fillRect(g, 0, 0, 219, 179, P.deepOcean);
  drawRect(g, 0, 0, 219, 179, P.oceanBlue);
  drawRect(g, 1, 1, 218, 178, P.skyBlue);
  // Title bar
  fillRect(g, 2, 2, 217, 16, P.oceanBlue);
  hLine(g, 2, 217, 2, P.skyBlue);
  fillRect(g, 8, 5, 70, 13, P.playerBlue);
  // Close button
  fillRect(g, 204, 4, 214, 14, P.enemyRed);
  drawRect(g, 204, 4, 214, 14, P.deepBlood);
  for (let i = 0; i < 7; i++) {
    setPixel(g, 206+i, 6+i, P.nearWhite);
    setPixel(g, 212-i, 6+i, P.nearWhite);
  }
  // Storage grid (left side — 5×7 = 35 slots)
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      const sx = 8 + col * 22;
      const sy = 22 + row * 22;
      fillRect(g, sx, sy, sx+17, sy+17, P.deepOcean);
      drawRect(g, sx, sy, sx+17, sy+17, P.stoneGray);
    }
  }
  // Player inventory (right side — 5×7 = 35 slots)
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      const sx = 120 + col * 22;
      const sy = 22 + row * 22;
      fillRect(g, sx, sy, sx+17, sy+17, P.deepOcean);
      drawRect(g, sx, sy, sx+17, sy+17, P.midGray);
    }
  }
  // Divider line
  vLine(g, 115, 20, 175, P.skyBlue);
  // Labels
  fillRect(g, 8, 22, 50, 18, P.oceanBlue); // "Storage" label area
  fillRect(g, 120, 22, 170, 18, P.oceanBlue); // "Inventory" label area
  // Transfer arrows
  fillRect(g, 108, 80, 122, 90, P.oceanBlue);
  drawRect(g, 108, 80, 122, 90, P.skyBlue);
  fillRect(g, 108, 95, 122, 105, P.oceanBlue);
  drawRect(g, 108, 95, 122, 105, P.skyBlue);
}, 220, 180);

// ========================================================================
// 8. HOUSING ICONS (16×16 each)
// ========================================================================
console.log('\n=== Housing Icons (16×16) ===');

function saveIcon(name, drawFn) {
  const grid = makeGrid(16, 16);
  drawFn(grid);
  save(16, 16, grid, path.join(OUT, `icon_housing_${name}.png`));
}

saveIcon('build', (g) => {
  // Hammer icon for build mode
  // Handle
  fillRect(g, 3, 8, 4, 14, P.richEarth);
  vLine(g, 3, 8, 14, P.dirt);
  // Hammer head
  fillRect(g, 1, 4, 8, 8, P.stoneGray);
  drawRect(g, 1, 4, 8, 8, P.darkRock);
  hLine(g, 2, 7, 4, P.lightStone);
  // Nails
  setPixel(g, 11, 3, P.midGray); setPixel(g, 12, 5, P.midGray);
  setPixel(g, 10, 6, P.midGray);
  // Spark
  setPixel(g, 9, 3, P.brightYellow);
});

saveIcon('decorate', (g) => {
  // Paintbrush icon for decorate mode
  // Brush tip
  fillRect(g, 1, 1, 5, 5, P.playerBlue);
  drawRect(g, 1, 1, 5, 5, P.oceanBlue);
  setPixel(g, 2, 2, P.skyBlue);
  setPixel(g, 1, 5, P.skyBlue);
  // Ferrule
  fillRect(g, 5, 5, 7, 7, P.stoneGray);
  // Handle
  fillRect(g, 7, 7, 9, 14, P.richEarth);
  drawRect(g, 7, 7, 9, 14, P.deepSoil);
  vLine(g, 8, 7, 14, P.dirt);
  // Paint drips
  setPixel(g, 2, 6, P.playerBlue);
  setPixel(g, 4, 7, P.skyBlue);
});

saveIcon('storage', (g) => {
  // Chest icon for storage
  // Chest body
  fillRect(g, 2, 6, 13, 13, P.richEarth);
  drawRect(g, 2, 6, 13, 13, P.deepSoil);
  // Lid
  fillRect(g, 1, 3, 14, 6, P.dirt);
  drawRect(g, 1, 3, 14, 6, P.deepSoil);
  hLine(g, 1, 14, 3, P.sand);
  // Metal band
  hLine(g, 2, 13, 9, P.stoneGray);
  // Lock
  fillRect(g, 6, 5, 9, 8, P.gold);
  drawRect(g, 6, 5, 9, 8, P.darkGold);
  setPixel(g, 7, 7, P.deepSoil);
  // Shadow
  hLine(g, 2, 13, 14, P.deepSoil);
});

// ========================================================================
// Summary
// ========================================================================
console.log('\n=== Housing Asset Generation Complete ===');
console.log(`Output directory: ${OUT}`);
