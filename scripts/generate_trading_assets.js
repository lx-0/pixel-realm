#!/usr/bin/env node
/**
 * Generate auction house and trading post UI art assets for PIX-406 / PIX-326.
 * All assets use the 32-color master palette from ART-STYLE-GUIDE.md.
 * Pixel art PNG output with nearest-neighbor intent.
 *
 * Output: public/assets/trading/
 *
 * Assets produced:
 *   NPC SPRITE (64×24 — 4 frames × 16×24):
 *     char_npc_auctioneer.png       — Auction house NPC with gavel
 *
 *   LISTING PANEL UI:
 *     ui_panel_auction_listing.png   — 220×180 auction listing panel
 *     ui_auction_search_bar.png      — 180×16 search input bar
 *     ui_auction_category_tab.png    — 40×16 category filter tab
 *     ui_auction_price_column.png    — 60×14 price column header
 *     ui_auction_item_row.png        — 200×20 single listing row
 *
 *   BUY/SELL DIALOGS:
 *     ui_dialog_buy_confirm.png      — 160×120 buy confirmation dialog
 *     ui_dialog_sell_confirm.png     — 160×120 sell confirmation dialog
 *
 *   TRADE WINDOW:
 *     ui_panel_trade_p2p.png         — 220×160 player-to-player trade window
 *     ui_trade_lock_btn.png          — 60×16 lock-in trade button
 *
 *   CURRENCY / BID ICONS (16×16 each):
 *     icon_bid_outbid.png            — Outbid indicator (red down arrow)
 *     icon_bid_winning.png           — Winning bid indicator (green up arrow)
 *     icon_bid_buyout.png            — Buyout price icon (gold lightning)
 *     icon_currency_pvp.png          — PvP token icon (already exists, skip if present)
 *
 *   ITEM RARITY FRAMES (18×18 each):
 *     ui_slot_rarity_common.png      — White/gray border
 *     ui_slot_rarity_uncommon.png    — Green border
 *     ui_slot_rarity_rare.png        — Blue border
 *     ui_slot_rarity_epic.png        — Purple border
 *     ui_slot_rarity_legendary.png   — Gold border
 *
 *   TRANSACTION HISTORY:
 *     ui_panel_auction_history.png   — 220×160 transaction history panel
 *     icon_tx_sold.png               — 16×16 sold indicator
 *     icon_tx_bought.png             — 16×16 bought indicator
 *     icon_tx_expired.png            — 16×16 expired listing indicator
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
  console.log(`  Created: ${filePath}`);
}

const OUT = path.join(__dirname, '..', 'public', 'assets', 'trading');

// Helper: create w×h grid filled with a color
function grid(w, h, fill = T) {
  const g = [];
  for (let y = 0; y < h; y++) g.push(new Array(w).fill(fill));
  return g;
}

// Helper: draw a filled rect on a grid
function fillRect(g, x0, y0, w, h, color) {
  for (let y = y0; y < y0 + h && y < g.length; y++)
    for (let x = x0; x < x0 + w && x < g[0].length; x++)
      g[y][x] = color;
}

// Helper: draw an outlined rect (1px border)
function strokeRect(g, x0, y0, w, h, color) {
  for (let x = x0; x < x0 + w && x < g[0].length; x++) {
    if (y0 < g.length) g[y0][x] = color;
    if (y0 + h - 1 < g.length) g[y0 + h - 1][x] = color;
  }
  for (let y = y0; y < y0 + h && y < g.length; y++) {
    if (x0 < g[0].length) g[y][x0] = color;
    if (x0 + w - 1 < g[0].length) g[y][x0 + w - 1] = color;
  }
}

// Helper: set a single pixel safely
function px(g, x, y, color) {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = color;
}

// Helper: draw standard panel frame (dark bg, wood border, gold trim dots)
// Matches style of ui_panel_marketplace.png and similar panels
function drawPanelFrame(g, w, h) {
  // Fill background
  fillRect(g, 0, 0, w, h, P.darkRock);
  // Outer wood border
  strokeRect(g, 0, 0, w, h, P.deepSoil);
  strokeRect(g, 1, 1, w - 2, h - 2, P.richEarth);
  // Inner dark area
  fillRect(g, 2, 2, w - 4, h - 4, P.darkRock);
  // Gold trim dots on corners
  px(g, 2, 2, P.gold);
  px(g, w - 3, 2, P.gold);
  px(g, 2, h - 3, P.gold);
  px(g, w - 3, h - 3, P.gold);
  // Gold dots along top and bottom borders (every 10px)
  for (let x = 12; x < w - 4; x += 10) {
    px(g, x, 0, P.gold);
    px(g, x, h - 1, P.gold);
  }
  // Gold dots along side borders (every 10px)
  for (let y = 12; y < h - 4; y += 10) {
    px(g, 0, y, P.gold);
    px(g, w - 1, y, P.gold);
  }
}

// Helper: draw a horizontal divider line
function drawDivider(g, y, x0, x1, color) {
  for (let x = x0; x <= x1 && x < g[0].length; x++) {
    if (y < g.length) g[y][x] = color;
  }
}

// ========================================================================
// 1. AUCTION HOUSE NPC SPRITE (64×24 — 4 frames of 16×24)
//    Well-dressed merchant with gavel, amber/gold vest
// ========================================================================
console.log('\n=== Auctioneer NPC Sprite (64x24) ===');
(function() {
  const W = 64, H = 24;
  const g = grid(W, H);
  // Shorthand colors
  const skin = P.paleSand;
  const skinDark = P.desertGold;
  const vest = P.darkGold;
  const vestLight = P.gold;
  const pants = P.deepSoil;
  const boots = P.richEarth;
  const hair = P.midGray;
  const gavel = P.dirt;
  const gavelHead = P.stoneGray;

  // Frame layout: each 16x24
  // Frame 0: idle facing down
  // Frame 1: idle holding gavel up
  // Frame 2: gavel mid-swing
  // Frame 3: gavel down (sold!)

  function drawBody(fx, gavelPhase) {
    const ox = fx * 16; // x offset

    // Hair (row 2-4)
    for (let x = 5; x <= 10; x++) px(g, ox+x, 2, hair);
    for (let x = 4; x <= 11; x++) px(g, ox+x, 3, hair);
    for (let x = 4; x <= 11; x++) px(g, ox+x, 4, hair);

    // Face/head (row 5-9)
    for (let x = 5; x <= 10; x++) px(g, ox+x, 5, skin);
    for (let x = 5; x <= 10; x++) px(g, ox+x, 6, skin);
    // Eyes
    px(g, ox+6, 6, P.black);
    px(g, ox+9, 6, P.black);
    for (let x = 5; x <= 10; x++) px(g, ox+x, 7, skin);
    // Mouth
    px(g, ox+7, 7, P.richEarth);
    px(g, ox+8, 7, P.richEarth);
    for (let x = 5; x <= 10; x++) px(g, ox+x, 8, skin);
    for (let x = 6; x <= 9; x++) px(g, ox+x, 9, skinDark);

    // Neck
    px(g, ox+7, 10, skin);
    px(g, ox+8, 10, skin);

    // Vest/torso (row 11-16)
    for (let y = 11; y <= 16; y++) {
      for (let x = 4; x <= 11; x++) {
        px(g, ox+x, y, vest);
      }
    }
    // Vest highlight (center line)
    for (let y = 11; y <= 16; y++) {
      px(g, ox+7, y, vestLight);
      px(g, ox+8, y, vestLight);
    }
    // Gold buttons
    px(g, ox+7, 12, P.brightYellow);
    px(g, ox+7, 14, P.brightYellow);
    px(g, ox+7, 16, P.brightYellow);

    // Arms (rows 11-16)
    // Left arm
    for (let y = 11; y <= 15; y++) {
      px(g, ox+3, y, vest);
      px(g, ox+2, y+1, skin);
    }
    // Right arm + gavel
    for (let y = 11; y <= 15; y++) {
      px(g, ox+12, y, vest);
    }

    // Gavel in right hand based on phase
    if (gavelPhase === 0) {
      // Holding at side
      px(g, ox+13, 14, skin);
      px(g, ox+13, 15, gavel);
      px(g, ox+13, 16, gavel);
      px(g, ox+13, 17, gavelHead);
      px(g, ox+14, 17, gavelHead);
    } else if (gavelPhase === 1) {
      // Gavel raised up
      px(g, ox+13, 11, skin);
      px(g, ox+13, 10, gavel);
      px(g, ox+13, 9, gavel);
      px(g, ox+12, 8, gavelHead);
      px(g, ox+13, 8, gavelHead);
      px(g, ox+14, 8, gavelHead);
    } else if (gavelPhase === 2) {
      // Mid swing (diagonal)
      px(g, ox+13, 12, skin);
      px(g, ox+14, 13, gavel);
      px(g, ox+14, 14, gavelHead);
      px(g, ox+13, 14, gavelHead);
    } else {
      // Down (sold!)
      px(g, ox+13, 15, skin);
      px(g, ox+13, 16, gavel);
      px(g, ox+12, 17, gavelHead);
      px(g, ox+13, 17, gavelHead);
      px(g, ox+14, 17, gavelHead);
    }

    // Left hand
    px(g, ox+2, 16, skin);

    // Pants (row 17-20)
    for (let y = 17; y <= 20; y++) {
      for (let x = 5; x <= 7; x++) px(g, ox+x, y, pants);
      for (let x = 8; x <= 10; x++) px(g, ox+x, y, pants);
    }
    // Leg gap
    for (let y = 18; y <= 20; y++) px(g, ox+7, y, P.darkRock);

    // Boots (row 21-22)
    for (let x = 4; x <= 7; x++) { px(g, ox+x, 21, boots); px(g, ox+x, 22, boots); }
    for (let x = 8; x <= 11; x++) { px(g, ox+x, 21, boots); px(g, ox+x, 22, boots); }
  }

  drawBody(0, 0);
  drawBody(1, 1);
  drawBody(2, 2);
  drawBody(3, 3);

  save(W, H, g, path.join(OUT, 'char_npc_auctioneer.png'));
})();

// ========================================================================
// 2. AUCTION LISTING PANEL (220×180)
//    Full auction house browser: title bar, search, category tabs,
//    column headers, item rows area, pagination
// ========================================================================
console.log('\n=== Auction Listing Panel (220x180) ===');
(function() {
  const W = 220, H = 180;
  const g = grid(W, H);
  drawPanelFrame(g, W, H);

  // Title bar area (row 4-14)
  fillRect(g, 4, 4, W - 8, 12, P.deepSoil);
  // Title text indicator (gold bar representing "AUCTION HOUSE")
  fillRect(g, 70, 7, 80, 5, P.gold);

  // Search bar area (row 18-30)
  fillRect(g, 6, 18, 180, 12, P.stoneGray);
  strokeRect(g, 6, 18, 180, 12, P.midGray);
  // Search icon (magnifying glass hint)
  px(g, 9, 21, P.paleGray);
  px(g, 10, 21, P.paleGray);
  px(g, 9, 22, P.paleGray);
  px(g, 11, 24, P.paleGray);
  // Search text placeholder bar
  fillRect(g, 14, 22, 60, 3, P.lightStone);

  // Search button
  fillRect(g, 190, 18, 24, 12, P.richEarth);
  strokeRect(g, 190, 18, 24, 12, P.deepSoil);
  fillRect(g, 196, 22, 12, 4, P.gold);

  // Category filter tabs (row 32-44)
  const categories = 5;
  const tabW = 40;
  for (let i = 0; i < categories; i++) {
    const tx = 6 + i * (tabW + 2);
    fillRect(g, tx, 32, tabW, 12, i === 0 ? P.richEarth : P.stoneGray);
    strokeRect(g, tx, 32, tabW, 12, P.deepSoil);
    // Tab label indicator
    fillRect(g, tx + 8, 36, tabW - 16, 4, i === 0 ? P.gold : P.midGray);
  }

  // Column headers (row 46-54)
  fillRect(g, 4, 46, W - 8, 10, P.deepSoil);
  // Item | Price | Bid | Buyout | Time
  const cols = [4, 80, 120, 155, 190];
  const colW = [74, 38, 33, 33, 24];
  for (let i = 0; i < cols.length; i++) {
    fillRect(g, cols[i] + 2, 48, colW[i] - 4, 5, P.desertGold);
    // Column divider
    if (i > 0) {
      for (let y = 47; y <= 54; y++) px(g, cols[i], y, P.richEarth);
    }
  }

  // Item listing rows (row 58 onwards, 8 rows of 12px each)
  for (let row = 0; row < 8; row++) {
    const ry = 58 + row * 13;
    const bgColor = row % 2 === 0 ? P.darkRock : P.stoneGray;
    fillRect(g, 4, ry, W - 8, 12, bgColor);
    // Item icon slot
    fillRect(g, 6, ry + 1, 10, 10, P.black);
    strokeRect(g, 6, ry + 1, 10, 10, P.stoneGray);
    // Item name placeholder
    fillRect(g, 18, ry + 4, 55, 4, row % 2 === 0 ? P.lightStone : P.paleGray);
    // Price text placeholder
    fillRect(g, 82, ry + 4, 30, 4, P.gold);
    // Bid text placeholder
    fillRect(g, 122, ry + 4, 25, 4, P.desertGold);
    // Buyout text placeholder
    fillRect(g, 157, ry + 4, 25, 4, P.brightYellow);
    // Time remaining placeholder
    fillRect(g, 192, ry + 4, 20, 4, P.paleGray);
    // Row divider
    drawDivider(g, ry + 12, 4, W - 5, P.stoneGray);
  }

  // Pagination area (bottom)
  fillRect(g, 70, H - 18, 80, 12, P.deepSoil);
  strokeRect(g, 70, H - 18, 80, 12, P.richEarth);
  // Page indicator dots
  for (let i = 0; i < 5; i++) {
    px(g, 95 + i * 8, H - 13, i === 0 ? P.gold : P.midGray);
    px(g, 96 + i * 8, H - 13, i === 0 ? P.gold : P.midGray);
  }
  // Prev/Next arrows
  px(g, 75, H - 13, P.paleGray);
  px(g, 76, H - 12, P.paleGray);
  px(g, 75, H - 11, P.paleGray);
  px(g, 143, H - 13, P.paleGray);
  px(g, 144, H - 12, P.paleGray);
  px(g, 143, H - 11, P.paleGray);

  save(W, H, g, path.join(OUT, 'ui_panel_auction_listing.png'));
})();

// ========================================================================
// 3. SEARCH BAR (180×16)
// ========================================================================
console.log('\n=== Search Bar (180x16) ===');
(function() {
  const W = 180, H = 16;
  const g = grid(W, H);
  fillRect(g, 0, 0, W, H, P.stoneGray);
  strokeRect(g, 0, 0, W, H, P.midGray);
  // Inner inset
  fillRect(g, 2, 2, W - 4, H - 4, P.darkRock);
  strokeRect(g, 2, 2, W - 4, H - 4, P.stoneGray);
  // Magnifying glass icon
  px(g, 5, 5, P.paleGray); px(g, 6, 5, P.paleGray); px(g, 7, 5, P.paleGray);
  px(g, 5, 6, P.paleGray); px(g, 7, 6, P.paleGray);
  px(g, 5, 7, P.paleGray); px(g, 6, 7, P.paleGray); px(g, 7, 7, P.paleGray);
  px(g, 8, 8, P.paleGray); px(g, 9, 9, P.paleGray);
  // Placeholder text line
  fillRect(g, 13, 6, 60, 3, P.midGray);
  save(W, H, g, path.join(OUT, 'ui_auction_search_bar.png'));
})();

// ========================================================================
// 4. CATEGORY FILTER TAB (40×16)
// ========================================================================
console.log('\n=== Category Tab (40x16) ===');
(function() {
  const W = 40, H = 16;
  const g = grid(W, H);
  fillRect(g, 0, 0, W, H, P.richEarth);
  strokeRect(g, 0, 0, W, H, P.deepSoil);
  // Top highlight
  drawDivider(g, 1, 1, W - 2, P.dirt);
  // Label placeholder
  fillRect(g, 8, 6, 24, 4, P.gold);
  save(W, H, g, path.join(OUT, 'ui_auction_category_tab.png'));
})();

// ========================================================================
// 5. PRICE COLUMN HEADER (60×14)
// ========================================================================
console.log('\n=== Price Column Header (60x14) ===');
(function() {
  const W = 60, H = 14;
  const g = grid(W, H);
  fillRect(g, 0, 0, W, H, P.deepSoil);
  strokeRect(g, 0, 0, W, H, P.richEarth);
  // Label placeholder
  fillRect(g, 10, 5, 40, 4, P.desertGold);
  // Sort arrow indicator
  px(g, 52, 4, P.gold);
  px(g, 51, 5, P.gold); px(g, 52, 5, P.gold); px(g, 53, 5, P.gold);
  px(g, 50, 6, P.gold); px(g, 51, 6, P.gold); px(g, 52, 6, P.gold); px(g, 53, 6, P.gold); px(g, 54, 6, P.gold);
  save(W, H, g, path.join(OUT, 'ui_auction_price_column.png'));
})();

// ========================================================================
// 6. ITEM LISTING ROW (200×20)
// ========================================================================
console.log('\n=== Item Listing Row (200x20) ===');
(function() {
  const W = 200, H = 20;
  const g = grid(W, H);
  fillRect(g, 0, 0, W, H, P.darkRock);
  // Bottom border
  drawDivider(g, H - 1, 0, W - 1, P.stoneGray);
  // Item icon slot (left)
  fillRect(g, 2, 2, 16, 16, P.black);
  strokeRect(g, 2, 2, 16, 16, P.stoneGray);
  // Item name placeholder
  fillRect(g, 22, 4, 50, 4, P.paleGray);
  // Item subtitle/level
  fillRect(g, 22, 11, 30, 3, P.midGray);
  // Current bid
  fillRect(g, 90, 7, 30, 5, P.gold);
  // Buyout price
  fillRect(g, 130, 7, 30, 5, P.brightYellow);
  // Time remaining
  fillRect(g, 170, 7, 24, 5, P.paleGray);
  save(W, H, g, path.join(OUT, 'ui_auction_item_row.png'));
})();

// ========================================================================
// 7. BUY CONFIRMATION DIALOG (160×120)
// ========================================================================
console.log('\n=== Buy Confirmation Dialog (160x120) ===');
(function() {
  const W = 160, H = 120;
  const g = grid(W, H);
  drawPanelFrame(g, W, H);

  // Title bar
  fillRect(g, 4, 4, W - 8, 14, P.deepSoil);
  fillRect(g, 40, 7, 80, 5, P.gold); // "CONFIRM PURCHASE"

  // Item preview area
  fillRect(g, 30, 24, 100, 40, P.black);
  strokeRect(g, 30, 24, 100, 40, P.stoneGray);
  // Item icon slot (centered)
  fillRect(g, 66, 30, 28, 28, P.stoneGray);
  strokeRect(g, 66, 30, 28, 28, P.midGray);

  // Price display area
  fillRect(g, 30, 70, 100, 16, P.deepSoil);
  // Gold coin icon
  px(g, 35, 75, P.gold); px(g, 36, 75, P.gold); px(g, 37, 75, P.gold);
  px(g, 35, 76, P.gold); px(g, 36, 76, P.brightYellow); px(g, 37, 76, P.gold);
  px(g, 35, 77, P.gold); px(g, 36, 77, P.gold); px(g, 37, 77, P.gold);
  // Price number placeholder
  fillRect(g, 42, 75, 40, 5, P.brightYellow);

  // Confirm button (green)
  fillRect(g, 10, H - 28, 60, 18, P.forestGreen);
  strokeRect(g, 10, H - 28, 60, 18, P.deepForest);
  fillRect(g, 20, H - 22, 40, 5, P.brightGrass); // "BUY"

  // Cancel button (red)
  fillRect(g, 90, H - 28, 60, 18, P.enemyRed);
  strokeRect(g, 90, H - 28, 60, 18, P.deepBlood);
  fillRect(g, 100, H - 22, 40, 5, P.brightRed); // "CANCEL"

  save(W, H, g, path.join(OUT, 'ui_dialog_buy_confirm.png'));
})();

// ========================================================================
// 8. SELL CONFIRMATION DIALOG (160×120)
// ========================================================================
console.log('\n=== Sell Confirmation Dialog (160x120) ===');
(function() {
  const W = 160, H = 120;
  const g = grid(W, H);
  drawPanelFrame(g, W, H);

  // Title bar
  fillRect(g, 4, 4, W - 8, 14, P.deepSoil);
  fillRect(g, 40, 7, 80, 5, P.desertGold); // "SELL ITEM"

  // Item preview slot
  fillRect(g, 60, 24, 40, 40, P.black);
  strokeRect(g, 60, 24, 40, 40, P.stoneGray);

  // Starting price input
  fillRect(g, 10, 70, 60, 14, P.stoneGray);
  strokeRect(g, 10, 70, 60, 14, P.midGray);
  fillRect(g, 14, 74, 40, 4, P.gold); // starting price

  // Buyout price input
  fillRect(g, 90, 70, 60, 14, P.stoneGray);
  strokeRect(g, 90, 70, 60, 14, P.midGray);
  fillRect(g, 94, 74, 40, 4, P.brightYellow); // buyout price

  // Duration selector
  fillRect(g, 40, 88, 80, 10, P.deepSoil);
  strokeRect(g, 40, 88, 80, 10, P.richEarth);
  fillRect(g, 55, 91, 50, 4, P.paleGray);

  // Confirm button
  fillRect(g, 10, H - 24, 60, 16, P.forestGreen);
  strokeRect(g, 10, H - 24, 60, 16, P.deepForest);
  fillRect(g, 20, H - 19, 40, 5, P.brightGrass);

  // Cancel button
  fillRect(g, 90, H - 24, 60, 16, P.enemyRed);
  strokeRect(g, 90, H - 24, 60, 16, P.deepBlood);
  fillRect(g, 100, H - 19, 40, 5, P.brightRed);

  save(W, H, g, path.join(OUT, 'ui_dialog_sell_confirm.png'));
})();

// ========================================================================
// 9. PLAYER-TO-PLAYER TRADE WINDOW (220×160)
//    Two-sided panel: your offer (left) + their offer (right)
//    with lock/accept buttons at bottom
// ========================================================================
console.log('\n=== P2P Trade Window (220x160) ===');
(function() {
  const W = 220, H = 160;
  const g = grid(W, H);
  drawPanelFrame(g, W, H);

  // Title bar
  fillRect(g, 4, 4, W - 8, 12, P.deepSoil);
  fillRect(g, 70, 7, 80, 5, P.gold); // "TRADE"

  // Center divider (vertical gold chain)
  for (let y = 20; y < H - 24; y++) {
    px(g, 109, y, P.gold);
    px(g, 110, y, P.darkGold);
    if (y % 4 === 0) { px(g, 108, y, P.darkGold); px(g, 111, y, P.darkGold); }
  }

  // Left panel: "Your Offer"
  fillRect(g, 6, 18, 100, 10, P.deepSoil);
  fillRect(g, 20, 20, 60, 5, P.desertGold); // "YOUR OFFER"

  // Your item slots (3×3 grid of 18×18)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = 14 + col * 22;
      const sy = 32 + row * 22;
      fillRect(g, sx, sy, 18, 18, P.black);
      strokeRect(g, sx, sy, 18, 18, P.stoneGray);
    }
  }

  // Your gold offer area
  fillRect(g, 14, 102, 84, 14, P.deepSoil);
  strokeRect(g, 14, 102, 84, 14, P.richEarth);
  // Gold coin
  px(g, 18, 107, P.gold); px(g, 19, 107, P.gold);
  px(g, 18, 108, P.gold); px(g, 19, 108, P.gold);
  // Amount placeholder
  fillRect(g, 24, 107, 40, 4, P.brightYellow);

  // Right panel: "Their Offer"
  fillRect(g, 114, 18, 100, 10, P.deepSoil);
  fillRect(g, 128, 20, 60, 5, P.desertGold); // "THEIR OFFER"

  // Their item slots (3×3 grid)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const sx = 122 + col * 22;
      const sy = 32 + row * 22;
      fillRect(g, sx, sy, 18, 18, P.black);
      strokeRect(g, sx, sy, 18, 18, P.stoneGray);
    }
  }

  // Their gold offer area
  fillRect(g, 122, 102, 84, 14, P.deepSoil);
  strokeRect(g, 122, 102, 84, 14, P.richEarth);
  px(g, 126, 107, P.gold); px(g, 127, 107, P.gold);
  px(g, 126, 108, P.gold); px(g, 127, 108, P.gold);
  fillRect(g, 132, 107, 40, 4, P.brightYellow);

  // Status indicators
  // Your lock status (left side)
  fillRect(g, 14, 120, 84, 10, P.stoneGray);
  fillRect(g, 30, 123, 50, 4, P.midGray); // "NOT LOCKED"
  // Their lock status (right side)
  fillRect(g, 122, 120, 84, 10, P.stoneGray);
  fillRect(g, 138, 123, 50, 4, P.midGray); // "NOT LOCKED"

  // Accept button (green, bottom left)
  fillRect(g, 14, H - 22, 84, 16, P.forestGreen);
  strokeRect(g, 14, H - 22, 84, 16, P.deepForest);
  fillRect(g, 34, H - 17, 44, 5, P.brightGrass); // "ACCEPT"

  // Cancel button (red, bottom right)
  fillRect(g, 122, H - 22, 84, 16, P.enemyRed);
  strokeRect(g, 122, H - 22, 84, 16, P.deepBlood);
  fillRect(g, 142, H - 17, 44, 5, P.brightRed); // "CANCEL"

  save(W, H, g, path.join(OUT, 'ui_panel_trade_p2p.png'));
})();

// ========================================================================
// 10. TRADE LOCK BUTTON (60×16)
// ========================================================================
console.log('\n=== Trade Lock Button (60x16) ===');
(function() {
  const W = 60, H = 16;
  const g = grid(W, H);
  fillRect(g, 0, 0, W, H, P.forestGreen);
  strokeRect(g, 0, 0, W, H, P.deepForest);
  // Top highlight
  drawDivider(g, 1, 1, W - 2, P.leafGreen);
  // Lock icon (padlock shape)
  // Shackle
  px(g, 7, 3, P.brightGrass); px(g, 8, 3, P.brightGrass); px(g, 9, 3, P.brightGrass);
  px(g, 6, 4, P.brightGrass); px(g, 10, 4, P.brightGrass);
  px(g, 6, 5, P.brightGrass); px(g, 10, 5, P.brightGrass);
  // Lock body
  fillRect(g, 5, 6, 7, 5, P.brightGrass);
  px(g, 8, 8, P.deepForest); // keyhole
  // Label placeholder
  fillRect(g, 16, 6, 36, 4, P.lightFoliage);
  save(W, H, g, path.join(OUT, 'ui_trade_lock_btn.png'));
})();

// ========================================================================
// 11. CURRENCY AND BID ICONS (16×16 each)
// ========================================================================
console.log('\n=== Currency & Bid Icons (16x16) ===');

// icon_bid_outbid — Red down arrow
(function() {
  const g = grid(16, 16);
  // Red down arrow on dark bg
  // Arrow pointing down
  px(g, 7, 3, P.brightRed); px(g, 8, 3, P.brightRed);
  px(g, 7, 4, P.brightRed); px(g, 8, 4, P.brightRed);
  px(g, 7, 5, P.brightRed); px(g, 8, 5, P.brightRed);
  px(g, 7, 6, P.brightRed); px(g, 8, 6, P.brightRed);
  px(g, 7, 7, P.brightRed); px(g, 8, 7, P.brightRed);
  px(g, 7, 8, P.brightRed); px(g, 8, 8, P.brightRed);
  // Arrow head
  px(g, 4, 9, P.enemyRed); px(g, 5, 9, P.brightRed);
  px(g, 6, 9, P.brightRed); px(g, 7, 9, P.brightRed); px(g, 8, 9, P.brightRed);
  px(g, 9, 9, P.brightRed); px(g, 10, 9, P.brightRed); px(g, 11, 9, P.enemyRed);
  px(g, 5, 10, P.enemyRed); px(g, 6, 10, P.brightRed);
  px(g, 7, 10, P.brightRed); px(g, 8, 10, P.brightRed);
  px(g, 9, 10, P.brightRed); px(g, 10, 10, P.enemyRed);
  px(g, 6, 11, P.enemyRed); px(g, 7, 11, P.brightRed);
  px(g, 8, 11, P.brightRed); px(g, 9, 11, P.enemyRed);
  px(g, 7, 12, P.enemyRed); px(g, 8, 12, P.enemyRed);
  save(16, 16, g, path.join(OUT, 'icon_bid_outbid.png'));
})();

// icon_bid_winning — Green up arrow
(function() {
  const g = grid(16, 16);
  px(g, 7, 12, P.leafGreen); px(g, 8, 12, P.leafGreen);
  px(g, 7, 11, P.leafGreen); px(g, 8, 11, P.leafGreen);
  px(g, 7, 10, P.leafGreen); px(g, 8, 10, P.leafGreen);
  px(g, 7, 9, P.leafGreen); px(g, 8, 9, P.leafGreen);
  px(g, 7, 8, P.leafGreen); px(g, 8, 8, P.leafGreen);
  px(g, 7, 7, P.leafGreen); px(g, 8, 7, P.leafGreen);
  // Arrow head
  px(g, 4, 6, P.forestGreen); px(g, 5, 6, P.leafGreen);
  px(g, 6, 6, P.leafGreen); px(g, 7, 6, P.leafGreen); px(g, 8, 6, P.leafGreen);
  px(g, 9, 6, P.leafGreen); px(g, 10, 6, P.leafGreen); px(g, 11, 6, P.forestGreen);
  px(g, 5, 5, P.forestGreen); px(g, 6, 5, P.leafGreen);
  px(g, 7, 5, P.leafGreen); px(g, 8, 5, P.leafGreen);
  px(g, 9, 5, P.leafGreen); px(g, 10, 5, P.forestGreen);
  px(g, 6, 4, P.forestGreen); px(g, 7, 4, P.leafGreen);
  px(g, 8, 4, P.leafGreen); px(g, 9, 4, P.forestGreen);
  px(g, 7, 3, P.forestGreen); px(g, 8, 3, P.forestGreen);
  save(16, 16, g, path.join(OUT, 'icon_bid_winning.png'));
})();

// icon_bid_buyout — Gold lightning bolt (instant buy)
(function() {
  const g = grid(16, 16);
  // Lightning bolt shape
  px(g, 9, 2, P.gold); px(g, 10, 2, P.gold);
  px(g, 8, 3, P.gold); px(g, 9, 3, P.brightYellow);
  px(g, 7, 4, P.gold); px(g, 8, 4, P.brightYellow);
  px(g, 6, 5, P.gold); px(g, 7, 5, P.brightYellow);
  px(g, 5, 6, P.gold); px(g, 6, 6, P.brightYellow); px(g, 7, 6, P.brightYellow);
  px(g, 8, 6, P.brightYellow); px(g, 9, 6, P.gold); px(g, 10, 6, P.gold);
  px(g, 5, 7, P.darkGold); px(g, 6, 7, P.gold); px(g, 7, 7, P.brightYellow);
  px(g, 8, 7, P.gold); px(g, 9, 7, P.darkGold);
  px(g, 7, 8, P.gold); px(g, 8, 8, P.brightYellow);
  px(g, 8, 9, P.gold); px(g, 9, 9, P.brightYellow);
  px(g, 9, 10, P.gold); px(g, 10, 10, P.brightYellow);
  px(g, 8, 11, P.darkGold); px(g, 9, 11, P.gold);
  px(g, 7, 12, P.darkGold); px(g, 8, 12, P.gold);
  px(g, 6, 13, P.darkGold); px(g, 7, 13, P.darkGold);
  save(16, 16, g, path.join(OUT, 'icon_bid_buyout.png'));
})();

// ========================================================================
// 12. ITEM RARITY BORDER FRAMES (18×18 each)
//     Matches ui_slot.png size, colored border per rarity
// ========================================================================
console.log('\n=== Item Rarity Frames (18x18) ===');
const rarities = [
  { name: 'common',    outer: P.lightStone, inner: P.midGray,      corner: P.paleGray },
  { name: 'uncommon',  outer: P.forestGreen, inner: P.leafGreen,   corner: P.brightGrass },
  { name: 'rare',      outer: P.oceanBlue,  inner: P.skyBlue,      corner: P.playerBlue },
  { name: 'epic',      outer: P.magicPurple, inner: P.manaViolet,  corner: P.spellGlow },
  { name: 'legendary', outer: P.darkGold,   inner: P.gold,          corner: P.brightYellow },
];

rarities.forEach(r => {
  const g = grid(18, 18);
  // Dark inner fill
  fillRect(g, 0, 0, 18, 18, P.black);
  // Outer border
  strokeRect(g, 0, 0, 18, 18, r.outer);
  // Inner border
  strokeRect(g, 1, 1, 16, 16, r.inner);
  // Corner accents
  px(g, 0, 0, r.corner); px(g, 17, 0, r.corner);
  px(g, 0, 17, r.corner); px(g, 17, 17, r.corner);
  // Inner corner glow
  px(g, 2, 2, r.inner); px(g, 15, 2, r.inner);
  px(g, 2, 15, r.inner); px(g, 15, 15, r.inner);
  save(18, 18, g, path.join(OUT, `ui_slot_rarity_${r.name}.png`));
});

// ========================================================================
// 13. TRANSACTION HISTORY PANEL (220×160)
// ========================================================================
console.log('\n=== Transaction History Panel (220x160) ===');
(function() {
  const W = 220, H = 160;
  const g = grid(W, H);
  drawPanelFrame(g, W, H);

  // Title bar
  fillRect(g, 4, 4, W - 8, 12, P.deepSoil);
  fillRect(g, 50, 7, 120, 5, P.gold); // "TRANSACTION HISTORY"

  // Filter tabs: All | Bought | Sold | Expired
  const tabs = 4;
  const tw = 50;
  for (let i = 0; i < tabs; i++) {
    const tx = 6 + i * (tw + 2);
    fillRect(g, tx, 20, tw, 10, i === 0 ? P.richEarth : P.stoneGray);
    strokeRect(g, tx, 20, tw, 10, P.deepSoil);
    fillRect(g, tx + 8, 23, tw - 16, 4, i === 0 ? P.gold : P.midGray);
  }

  // Column headers
  fillRect(g, 4, 34, W - 8, 10, P.deepSoil);
  // Type | Item | Price | Date
  fillRect(g, 8, 36, 20, 5, P.desertGold);
  fillRect(g, 38, 36, 60, 5, P.desertGold);
  fillRect(g, 108, 36, 40, 5, P.desertGold);
  fillRect(g, 158, 36, 50, 5, P.desertGold);

  // Transaction rows (8 rows)
  for (let row = 0; row < 8; row++) {
    const ry = 48 + row * 13;
    const bgColor = row % 2 === 0 ? P.darkRock : P.stoneGray;
    fillRect(g, 4, ry, W - 8, 12, bgColor);
    // Status icon placeholder
    fillRect(g, 8, ry + 3, 8, 6, row % 3 === 0 ? P.leafGreen : row % 3 === 1 ? P.playerBlue : P.midGray);
    // Item name
    fillRect(g, 22, ry + 4, 55, 4, P.paleGray);
    // Price
    fillRect(g, 110, ry + 4, 35, 4, P.gold);
    // Date
    fillRect(g, 160, ry + 4, 45, 4, P.lightStone);
    // Row divider
    drawDivider(g, ry + 12, 4, W - 5, P.stoneGray);
  }

  // Pagination
  fillRect(g, 80, H - 16, 60, 10, P.deepSoil);
  strokeRect(g, 80, H - 16, 60, 10, P.richEarth);
  for (let i = 0; i < 3; i++) {
    px(g, 100 + i * 8, H - 12, i === 0 ? P.gold : P.midGray);
    px(g, 101 + i * 8, H - 12, i === 0 ? P.gold : P.midGray);
  }

  save(W, H, g, path.join(OUT, 'ui_panel_auction_history.png'));
})();

// ========================================================================
// 14. TRANSACTION STATUS ICONS (16×16 each)
// ========================================================================
console.log('\n=== Transaction Status Icons (16x16) ===');

// icon_tx_sold — Green coin with checkmark (sold item)
(function() {
  const g = grid(16, 16);
  // Coin circle
  for (let y = 3; y <= 12; y++) {
    for (let x = 3; x <= 12; x++) {
      const dx = x - 7.5, dy = y - 7.5;
      if (dx*dx + dy*dy <= 20) px(g, x, y, P.forestGreen);
      if (dx*dx + dy*dy <= 14) px(g, x, y, P.leafGreen);
    }
  }
  // Checkmark
  px(g, 5, 8, P.nearWhite);
  px(g, 6, 9, P.nearWhite);
  px(g, 7, 10, P.nearWhite);
  px(g, 8, 9, P.nearWhite);
  px(g, 9, 8, P.nearWhite);
  px(g, 10, 7, P.nearWhite);
  px(g, 11, 6, P.nearWhite);
  save(16, 16, g, path.join(OUT, 'icon_tx_sold.png'));
})();

// icon_tx_bought — Blue coin with arrow down (bought item)
(function() {
  const g = grid(16, 16);
  // Coin circle
  for (let y = 3; y <= 12; y++) {
    for (let x = 3; x <= 12; x++) {
      const dx = x - 7.5, dy = y - 7.5;
      if (dx*dx + dy*dy <= 20) px(g, x, y, P.oceanBlue);
      if (dx*dx + dy*dy <= 14) px(g, x, y, P.skyBlue);
    }
  }
  // Down arrow
  px(g, 7, 4, P.nearWhite); px(g, 8, 4, P.nearWhite);
  px(g, 7, 5, P.nearWhite); px(g, 8, 5, P.nearWhite);
  px(g, 7, 6, P.nearWhite); px(g, 8, 6, P.nearWhite);
  px(g, 7, 7, P.nearWhite); px(g, 8, 7, P.nearWhite);
  px(g, 5, 8, P.nearWhite); px(g, 6, 8, P.nearWhite);
  px(g, 7, 8, P.nearWhite); px(g, 8, 8, P.nearWhite);
  px(g, 9, 8, P.nearWhite); px(g, 10, 8, P.nearWhite);
  px(g, 6, 9, P.nearWhite); px(g, 7, 9, P.nearWhite);
  px(g, 8, 9, P.nearWhite); px(g, 9, 9, P.nearWhite);
  px(g, 7, 10, P.nearWhite); px(g, 8, 10, P.nearWhite);
  save(16, 16, g, path.join(OUT, 'icon_tx_bought.png'));
})();

// icon_tx_expired — Gray clock with X (expired listing)
(function() {
  const g = grid(16, 16);
  // Clock circle
  for (let y = 3; y <= 12; y++) {
    for (let x = 3; x <= 12; x++) {
      const dx = x - 7.5, dy = y - 7.5;
      if (dx*dx + dy*dy <= 20) px(g, x, y, P.midGray);
      if (dx*dx + dy*dy <= 14) px(g, x, y, P.stoneGray);
    }
  }
  // Clock hands
  px(g, 7, 5, P.paleGray); px(g, 8, 5, P.paleGray);
  px(g, 7, 6, P.paleGray); px(g, 8, 6, P.paleGray);
  px(g, 7, 7, P.paleGray); px(g, 8, 7, P.paleGray);
  px(g, 9, 7, P.paleGray); px(g, 10, 7, P.paleGray);
  // X overlay
  px(g, 4, 4, P.brightRed); px(g, 11, 4, P.brightRed);
  px(g, 5, 5, P.brightRed); px(g, 10, 5, P.brightRed);
  px(g, 10, 10, P.brightRed); px(g, 5, 10, P.brightRed);
  px(g, 4, 11, P.brightRed); px(g, 11, 11, P.brightRed);
  save(16, 16, g, path.join(OUT, 'icon_tx_expired.png'));
})();

console.log('\n=== All trading assets generated! ===');
