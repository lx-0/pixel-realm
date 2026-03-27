#!/usr/bin/env node
/**
 * Generate mailbox and notification system UI art assets for PIX-348.
 * All assets use the 32-color master palette from ART-STYLE-GUIDE.md.
 * Pixel art PNG output with nearest-neighbor intent.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Master palette
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

// Minimal PNG encoder using only Node.js built-in zlib
function writePNG(w, h, pixels) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const offset = y * (1 + w * 4);
    raw[offset] = 0;
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
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeAndData));
    return Buffer.concat([len, typeAndData, crc]);
  }

  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function save(w, h, pixels, filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, writePNG(w, h, pixels));
  console.log(`  Created: ${filePath}`);
}

// Helper: create a blank grid
function makeGrid(w, h, fill = T) {
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill(fill));
  return grid;
}

// Helper: draw a rectangle outline
function drawRect(grid, x1, y1, x2, y2, color) {
  for (let x = x1; x <= x2; x++) { grid[y1][x] = color; grid[y2][x] = color; }
  for (let y = y1; y <= y2; y++) { grid[y][x1] = color; grid[y][x2] = color; }
}

// Helper: fill a rectangle
function fillRect(grid, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2; y++)
    for (let x = x1; x <= x2; x++)
      grid[y][x] = color;
}

// Helper: draw a horizontal line
function hLine(grid, x1, x2, y, color) {
  for (let x = x1; x <= x2; x++) grid[y][x] = color;
}

// Helper: draw a vertical line
function vLine(grid, x, y1, y2, color) {
  for (let y = y1; y <= y2; y++) grid[y][x] = color;
}

const ASSETS = path.join(__dirname, '..', 'assets');
const UI = path.join(ASSETS, 'ui');
const SPRITES = path.join(ASSETS, 'sprites');

// ========================================================================
// 1. MAILBOX NPC SPRITE (16x24, 2-frame idle spritesheet)
//    Town NPC: wooden mailbox post with flag, friendly blue/earth tones
//    Spritesheet: 2 columns (frame 1, frame 2) x 1 row, each 16x24
// ========================================================================
console.log('\n=== Mailbox NPC Sprite (16x24, 2-frame idle) ===');
{
  const fw = 16, fh = 24;
  const w = fw * 2, h = fh; // 2 frames side by side

  // Frame 1: mailbox with flag down (no mail waiting)
  function drawMailboxFrame(grid, ox, flagUp) {
    // Wooden post (center, rows 16-23)
    fillRect(grid, ox+6, 16, ox+9, 23, P.richEarth);
    // Post highlight
    vLine(grid, ox+7, 16, 23, P.dirt);
    // Post shadow
    vLine(grid, ox+9, 17, 23, P.deepSoil);

    // Mailbox body (rows 6-15, a wide box)
    fillRect(grid, ox+2, 8, ox+13, 15, P.playerBlue);
    // Mailbox top (rounded)
    hLine(grid, ox+3, ox+12, 7, P.playerBlue);
    hLine(grid, ox+4, ox+11, 6, P.skyBlue);
    // Mailbox outline
    drawRect(grid, ox+2, 7, ox+13, 15, P.oceanBlue);
    hLine(grid, ox+3, ox+12, 7, P.oceanBlue);
    hLine(grid, ox+4, ox+11, 6, P.oceanBlue);
    // Mailbox front face detail (slot)
    hLine(grid, ox+5, ox+10, 11, P.deepOcean);
    // Mailbox highlight
    hLine(grid, ox+4, ox+11, 8, P.paleWater);
    // Mailbox latch/handle
    grid[12][ox+7] = P.gold;
    grid[12][ox+8] = P.gold;

    // Flag on right side
    if (flagUp) {
      // Flag pole
      vLine(grid, ox+13, 3, 7, P.midGray);
      // Flag (red = mail waiting!)
      fillRect(grid, ox+13, 3, ox+15, 5, P.brightRed);
      grid[3][ox+13] = P.enemyRed;
    } else {
      // Flag pole (down position)
      vLine(grid, ox+13, 9, 12, P.midGray);
      // Flag (down, small)
      grid[12][ox+14] = P.midGray;
      grid[13][ox+14] = P.midGray;
    }

    // Ground base
    hLine(grid, ox+4, ox+11, 23, P.stoneGray);
    hLine(grid, ox+5, ox+10, 22, P.midGray);
  }

  const grid = makeGrid(w, h);

  // Frame 1: flag down (idle frame 1)
  drawMailboxFrame(grid, 0, false);

  // Frame 2: flag up with slight sparkle (idle frame 2 — shows "you have mail")
  drawMailboxFrame(grid, 16, true);
  // Add small sparkle near flag in frame 2
  grid[2][16+14] = P.brightYellow;
  grid[1][16+15] = P.paleHighlight;
  grid[4][16+15] = P.brightYellow;

  save(w, h, grid, path.join(SPRITES, 'npcs', 'char_npc_mailbox.png'));
}

// ========================================================================
// 2. NOTIFICATION BELL ICONS (16x16)
//    icon_mail_bell.png — bell without badge
//    icon_mail_bell_unread.png — bell with red unread count dot
// ========================================================================
console.log('\n=== Notification Bell Icons (16x16) ===');
{
  function drawBell(grid) {
    const g = P.gold, d = P.darkGold, y = P.brightYellow, s = P.paleHighlight;
    // Bell top nub
    grid[1][7] = d; grid[1][8] = d;
    // Bell dome
    hLine(grid, 5, 10, 2, d);
    hLine(grid, 4, 11, 3, g);
    hLine(grid, 3, 12, 4, g);
    hLine(grid, 3, 12, 5, g);
    hLine(grid, 3, 12, 6, g);
    hLine(grid, 3, 12, 7, g);
    hLine(grid, 2, 13, 8, g);
    hLine(grid, 2, 13, 9, d);
    // Bell highlight
    vLine(grid, 5, 3, 7, y);
    grid[4][4] = y;
    // Bell rim
    hLine(grid, 1, 14, 10, d);
    // Clapper
    grid[11][7] = d; grid[11][8] = d;
    grid[12][7] = P.dirt; grid[12][8] = P.dirt;
  }

  // Bell without badge
  const bellGrid = makeGrid(16, 16);
  drawBell(bellGrid);
  save(16, 16, bellGrid, path.join(UI, 'hud', 'icon_mail_bell.png'));

  // Bell with unread badge (red dot with count indicator top-right)
  const bellUnreadGrid = makeGrid(16, 16);
  drawBell(bellUnreadGrid);
  // Red unread badge circle (top-right)
  fillRect(bellUnreadGrid, 11, 0, 14, 3, P.brightRed);
  bellUnreadGrid[0][11] = T; bellUnreadGrid[0][14] = T;
  bellUnreadGrid[3][11] = T; bellUnreadGrid[3][14] = T;
  // White dot in badge center
  bellUnreadGrid[1][12] = P.nearWhite;
  bellUnreadGrid[1][13] = P.nearWhite;
  save(16, 16, bellUnreadGrid, path.join(UI, 'hud', 'icon_mail_bell_unread.png'));
}

// ========================================================================
// 3. MAIL ITEM ICONS (16x16 each)
//    Envelope-style icons for the mail list
// ========================================================================
console.log('\n=== Mail Item Icons (16x16) ===');

// icon_mail_letter_unread.png — sealed envelope (bright, highlighted)
{
  const grid = makeGrid(16, 16);
  // Envelope body
  fillRect(grid, 1, 4, 14, 13, P.paleGray);
  drawRect(grid, 1, 4, 14, 13, P.midGray);
  // Envelope flap (V shape pointing down)
  grid[4][1] = P.lightStone; grid[4][14] = P.lightStone;
  grid[5][2] = P.lightStone; grid[5][13] = P.lightStone;
  grid[6][3] = P.lightStone; grid[6][12] = P.lightStone;
  grid[7][4] = P.lightStone; grid[7][11] = P.lightStone;
  grid[8][5] = P.lightStone; grid[8][10] = P.lightStone;
  grid[9][6] = P.midGray; grid[9][9] = P.midGray;
  grid[9][7] = P.midGray; grid[9][8] = P.midGray;
  // Seal (gold wax seal at center)
  grid[8][7] = P.gold; grid[8][8] = P.gold;
  grid[9][7] = P.darkGold; grid[9][8] = P.darkGold;
  // Unread glow indicator (bright dot top-right)
  grid[2][12] = P.brightYellow; grid[2][13] = P.brightYellow;
  grid[3][12] = P.brightYellow; grid[3][13] = P.brightYellow;
  save(16, 16, grid, path.join(UI, 'icons', 'icon_mail_letter_unread.png'));
}

// icon_mail_letter_read.png — opened envelope (muted colors)
{
  const grid = makeGrid(16, 16);
  // Envelope body (slightly lower, opened)
  fillRect(grid, 1, 6, 14, 13, P.lightStone);
  drawRect(grid, 1, 6, 14, 13, P.midGray);
  // Open flap (V pointing up)
  grid[6][1] = P.midGray; grid[6][14] = P.midGray;
  grid[5][2] = P.lightStone; grid[5][13] = P.lightStone;
  grid[4][3] = P.lightStone; grid[4][12] = P.lightStone;
  grid[3][4] = P.paleGray; grid[3][11] = P.paleGray;
  grid[2][5] = P.paleGray; grid[2][10] = P.paleGray;
  grid[1][6] = P.paleGray; grid[1][9] = P.paleGray;
  grid[1][7] = P.paleGray; grid[1][8] = P.paleGray;
  // Letter peeking out
  fillRect(grid, 3, 3, 12, 7, P.nearWhite);
  drawRect(grid, 3, 3, 12, 6, P.paleGray);
  // Text lines on letter
  hLine(grid, 5, 10, 4, P.lightStone);
  hLine(grid, 5, 9, 5, P.lightStone);
  save(16, 16, grid, path.join(UI, 'icons', 'icon_mail_letter_read.png'));
}

// icon_mail_package.png — small package/parcel (has attachment)
{
  const grid = makeGrid(16, 16);
  // Box body
  fillRect(grid, 2, 4, 13, 13, P.sand);
  drawRect(grid, 2, 4, 13, 13, P.richEarth);
  // Box cross-tape
  vLine(grid, 7, 4, 13, P.dirt);
  vLine(grid, 8, 4, 13, P.dirt);
  hLine(grid, 2, 13, 8, P.dirt);
  hLine(grid, 2, 13, 9, P.dirt);
  // Tape highlight
  vLine(grid, 7, 5, 7, P.desertGold);
  hLine(grid, 3, 6, 8, P.desertGold);
  // Small attachment indicator (paperclip shape top-right)
  grid[2][11] = P.lightStone; grid[2][12] = P.lightStone;
  grid[3][11] = P.lightStone; grid[3][13] = P.lightStone;
  grid[4][13] = P.lightStone;
  save(16, 16, grid, path.join(UI, 'icons', 'icon_mail_package.png'));
}

// icon_mail_system.png — gear/cog system notice
{
  const grid = makeGrid(16, 16);
  const c = P.playerBlue, d = P.oceanBlue, h2 = P.paleWater;
  // Gear shape (simplified cog)
  // Center
  fillRect(grid, 6, 6, 9, 9, c);
  grid[7][7] = d; grid[7][8] = d; grid[8][7] = d; grid[8][8] = d;
  // Teeth (N, S, E, W, and diagonals)
  grid[3][7] = c; grid[3][8] = c; grid[4][7] = c; grid[4][8] = c; // N
  grid[11][7] = c; grid[11][8] = c; grid[12][7] = c; grid[12][8] = c; // S
  grid[7][3] = c; grid[8][3] = c; grid[7][4] = c; grid[8][4] = c; // W
  grid[7][11] = c; grid[8][11] = c; grid[7][12] = c; grid[8][12] = c; // E
  // Diagonal teeth
  grid[4][4] = c; grid[5][5] = c; // NW
  grid[4][11] = c; grid[5][10] = c; // NE
  grid[11][4] = c; grid[10][5] = c; // SW
  grid[11][11] = c; grid[10][10] = c; // SE
  // Connect to body
  grid[5][7] = c; grid[5][8] = c;
  grid[10][7] = c; grid[10][8] = c;
  grid[7][5] = c; grid[8][5] = c;
  grid[7][10] = c; grid[8][10] = c;
  // Center highlight
  grid[7][7] = h2; grid[7][8] = h2;
  // Outline teeth darker
  grid[3][7] = d; grid[3][8] = d;
  grid[12][7] = d; grid[12][8] = d;
  grid[7][3] = d; grid[8][3] = d;
  grid[7][12] = d; grid[8][12] = d;
  save(16, 16, grid, path.join(UI, 'icons', 'icon_mail_system.png'));
}

// icon_mail_guild.png — shield/banner for guild bulletins
{
  const grid = makeGrid(16, 16);
  // Shield shape
  hLine(grid, 4, 11, 2, P.oceanBlue);
  hLine(grid, 3, 12, 3, P.oceanBlue);
  fillRect(grid, 3, 3, 12, 10, P.playerBlue);
  drawRect(grid, 3, 3, 12, 10, P.oceanBlue);
  // Shield bottom point
  hLine(grid, 4, 11, 11, P.playerBlue);
  grid[11][4] = P.oceanBlue; grid[11][11] = P.oceanBlue;
  hLine(grid, 5, 10, 12, P.playerBlue);
  grid[12][5] = P.oceanBlue; grid[12][10] = P.oceanBlue;
  hLine(grid, 6, 9, 13, P.oceanBlue);
  grid[13][6] = P.oceanBlue; grid[13][9] = P.oceanBlue;
  hLine(grid, 7, 8, 14, P.oceanBlue);
  // Shield inner fill
  fillRect(grid, 4, 4, 11, 10, P.skyBlue);
  hLine(grid, 5, 10, 11, P.skyBlue);
  hLine(grid, 6, 9, 12, P.skyBlue);
  hLine(grid, 7, 8, 13, P.skyBlue);
  // Emblem: star/cross in center
  grid[6][7] = P.gold; grid[6][8] = P.gold;
  grid[7][6] = P.gold; grid[7][7] = P.brightYellow; grid[7][8] = P.brightYellow; grid[7][9] = P.gold;
  grid[8][7] = P.gold; grid[8][8] = P.gold;
  grid[5][7] = P.darkGold; grid[5][8] = P.darkGold;
  grid[9][7] = P.darkGold; grid[9][8] = P.darkGold;
  save(16, 16, grid, path.join(UI, 'icons', 'icon_mail_guild.png'));
}

// ========================================================================
// 4. MAIL UI PANELS
// ========================================================================
console.log('\n=== Mail UI Panels ===');

// Helper: draw standard panel with title bar
function drawPanel(w, h, titleText, borderColor = P.playerBlue, bgColor = P.darkRock) {
  const grid = makeGrid(w, h, bgColor);

  // Border (1px)
  for (let x = 0; x < w; x++) { grid[0][x] = borderColor; grid[h-1][x] = borderColor; }
  for (let y = 0; y < h; y++) { grid[y][0] = borderColor; grid[y][w-1] = borderColor; }

  // Title bar (rows 1-11)
  fillRect(grid, 1, 1, w-2, 11, P.deepOcean);
  // Title bar bottom line
  hLine(grid, 1, w-2, 12, P.oceanBlue);

  // Close button (top-right corner, red X)
  fillRect(grid, w-11, 2, w-3, 10, P.deepBlood);
  drawRect(grid, w-11, 2, w-3, 10, P.enemyRed);
  // X inside close button
  grid[4][w-9] = P.nearWhite; grid[4][w-5] = P.nearWhite;
  grid[5][w-8] = P.nearWhite; grid[5][w-6] = P.nearWhite;
  grid[6][w-7] = P.nearWhite;
  grid[7][w-8] = P.nearWhite; grid[7][w-6] = P.nearWhite;
  grid[8][w-9] = P.nearWhite; grid[8][w-5] = P.nearWhite;

  // Corner highlights
  grid[1][1] = P.oceanBlue; grid[1][w-2] = P.oceanBlue;

  return grid;
}

// ui_panel_mail_inbox.png (96x128) — inbox list view
{
  const w = 96, h = 128;
  const grid = drawPanel(w, h, 'MAIL');

  // Title text area (indicate "INBOX" visually with pixel dots)
  // Simple pixel text hint for "MAIL" in title bar
  hLine(grid, 4, 8, 4, P.paleWater); // M shape hint
  hLine(grid, 11, 14, 4, P.paleWater); // A
  hLine(grid, 17, 17, 4, P.paleWater); // I
  hLine(grid, 20, 23, 4, P.paleWater); // L
  // Second line for emphasis
  grid[5][4] = P.paleWater; grid[5][6] = P.paleWater; grid[5][8] = P.paleWater; // M legs
  grid[6][4] = P.paleWater; grid[6][5] = P.paleWater; grid[6][7] = P.paleWater; grid[6][8] = P.paleWater; // M mid
  grid[7][4] = P.paleWater; grid[7][8] = P.paleWater; // M base

  // Tab bar below title (Inbox | Sent | System)
  fillRect(grid, 1, 13, w-2, 20, P.stoneGray);
  hLine(grid, 1, w-2, 20, P.midGray);
  // Active tab highlight (Inbox)
  fillRect(grid, 2, 14, 30, 19, P.deepOcean);
  hLine(grid, 2, 30, 13, P.playerBlue);
  // Tab dividers
  vLine(grid, 31, 14, 19, P.midGray);
  vLine(grid, 62, 14, 19, P.midGray);
  // Tab text hints
  hLine(grid, 8, 24, 16, P.paleWater); // "Inbox" text hint
  hLine(grid, 37, 52, 16, P.lightStone); // "Sent" text hint
  hLine(grid, 68, 86, 16, P.lightStone); // "System" text hint

  // Mail list rows (each 16px tall: icon area + text area + separator)
  for (let row = 0; row < 5; row++) {
    const ry = 22 + row * 18;
    // Row background (alternating)
    const rowBg = row % 2 === 0 ? P.darkRock : P.black;
    fillRect(grid, 1, ry, w-2, ry + 16, rowBg);
    // Separator line
    hLine(grid, 1, w-2, ry + 17, P.stoneGray);

    // Mail icon placeholder (left side)
    fillRect(grid, 4, ry + 2, 17, ry + 13, P.stoneGray);
    drawRect(grid, 4, ry + 2, 17, ry + 13, P.midGray);

    // Envelope mini icon inside placeholder
    fillRect(grid, 6, ry + 5, 15, ry + 11, P.paleGray);
    // V flap
    grid[ry+5][6] = P.lightStone; grid[ry+5][15] = P.lightStone;
    grid[ry+6][7] = P.lightStone; grid[ry+6][14] = P.lightStone;
    grid[ry+7][8] = P.lightStone; grid[ry+7][13] = P.lightStone;
    grid[ry+8][9] = P.midGray; grid[ry+8][10] = P.midGray;
    grid[ry+8][11] = P.midGray; grid[ry+8][12] = P.midGray;

    // Sender text line (placeholder)
    hLine(grid, 20, 70, ry + 4, P.paleGray);
    // Subject text line
    hLine(grid, 20, 80, ry + 8, P.lightStone);
    // Date text
    hLine(grid, 20, 50, ry + 12, P.midGray);

    // Unread indicator (first 2 rows have gold dots)
    if (row < 2) {
      grid[ry + 3][w-6] = P.brightYellow;
      grid[ry + 3][w-5] = P.brightYellow;
      grid[ry + 4][w-6] = P.brightYellow;
      grid[ry + 4][w-5] = P.brightYellow;
    }
  }

  // Bottom bar with page controls
  fillRect(grid, 1, h-14, w-2, h-2, P.stoneGray);
  hLine(grid, 1, w-2, h-14, P.midGray);
  // Compose button (left)
  fillRect(grid, 4, h-12, 30, h-4, P.oceanBlue);
  drawRect(grid, 4, h-12, 30, h-4, P.playerBlue);
  hLine(grid, 10, 24, h-8, P.paleWater); // "New" text
  // Page dots (right)
  grid[h-8][w-20] = P.playerBlue; grid[h-8][w-16] = P.midGray; grid[h-8][w-12] = P.midGray;

  save(w, h, grid, path.join(UI, 'mail', 'ui_panel_mail_inbox.png'));
}

// ui_panel_mail_detail.png (96x128) — message detail view
{
  const w = 96, h = 128;
  const grid = drawPanel(w, h, 'MESSAGE');

  // Back button (top-left in title bar)
  grid[5][4] = P.paleWater; grid[6][3] = P.paleWater; grid[7][4] = P.paleWater;
  hLine(grid, 4, 8, 6, P.paleWater); // Arrow + line

  // From/To header area
  fillRect(grid, 1, 13, w-2, 28, P.black);
  hLine(grid, 1, w-2, 28, P.stoneGray);
  // "From:" label
  hLine(grid, 4, 18, 16, P.midGray);
  // Sender name
  hLine(grid, 22, 60, 16, P.paleGray);
  // "To:" label
  hLine(grid, 4, 14, 21, P.midGray);
  // Recipient name
  hLine(grid, 22, 50, 21, P.paleGray);
  // Date
  hLine(grid, 62, 90, 21, P.stoneGray);
  // Subject line
  hLine(grid, 4, 80, 26, P.nearWhite);

  // Message body area
  fillRect(grid, 1, 29, w-2, 95, P.darkRock);
  // Text lines (body content placeholders)
  for (let line = 0; line < 8; line++) {
    const ly = 33 + line * 7;
    const lineLen = line === 7 ? 50 : 80; // Last line shorter
    hLine(grid, 4, Math.min(4 + lineLen, w-4), ly, P.lightStone);
  }

  // Attachment area (bottom section)
  hLine(grid, 1, w-2, 96, P.stoneGray);
  fillRect(grid, 1, 97, w-2, 112, P.black);
  // "Attachments:" label
  hLine(grid, 4, 40, 100, P.midGray);
  // Attachment slot
  drawRect(grid, 4, 103, 27, 111, P.stoneGray);
  fillRect(grid, 5, 104, 26, 110, P.darkRock);
  // Package icon inside slot
  fillRect(grid, 10, 105, 21, 109, P.sand);
  drawRect(grid, 10, 105, 21, 109, P.richEarth);

  // Bottom action bar
  fillRect(grid, 1, h-14, w-2, h-2, P.stoneGray);
  hLine(grid, 1, w-2, h-14, P.midGray);
  // Reply button
  fillRect(grid, 4, h-12, 30, h-4, P.oceanBlue);
  drawRect(grid, 4, h-12, 30, h-4, P.playerBlue);
  hLine(grid, 8, 26, h-8, P.paleWater); // "Reply" text
  // Delete button
  fillRect(grid, 34, h-12, 60, h-4, P.deepBlood);
  drawRect(grid, 34, h-12, 60, h-4, P.enemyRed);
  hLine(grid, 40, 54, h-8, P.nearWhite); // "Delete" text
  // Take attachment button
  fillRect(grid, 64, h-12, 92, h-4, P.forestGreen);
  drawRect(grid, 64, h-12, 92, h-4, P.leafGreen);
  hLine(grid, 70, 86, h-8, P.nearWhite); // "Take" text

  save(w, h, grid, path.join(UI, 'mail', 'ui_panel_mail_detail.png'));
}

// ui_panel_mail_compose.png (96x96) — compose/send mail frame
{
  const w = 96, h = 96;
  const grid = drawPanel(w, h, 'COMPOSE');

  // Compose icon hint in title
  grid[5][4] = P.paleWater; grid[6][5] = P.paleWater; grid[7][6] = P.paleWater;
  grid[5][5] = P.paleWater; // Pen nib

  // To field
  fillRect(grid, 1, 13, w-2, 22, P.black);
  hLine(grid, 1, w-2, 22, P.stoneGray);
  hLine(grid, 4, 14, 16, P.midGray); // "To:" label
  // Input field
  fillRect(grid, 18, 14, w-4, 20, P.darkRock);
  drawRect(grid, 18, 14, w-4, 20, P.stoneGray);
  hLine(grid, 22, 60, 17, P.paleGray); // Typed name placeholder

  // Subject field
  fillRect(grid, 1, 23, w-2, 32, P.black);
  hLine(grid, 1, w-2, 32, P.stoneGray);
  hLine(grid, 4, 24, 26, P.midGray); // "Subject:" label
  fillRect(grid, 28, 24, w-4, 30, P.darkRock);
  drawRect(grid, 28, 24, w-4, 30, P.stoneGray);
  hLine(grid, 32, 74, 27, P.paleGray); // Subject text

  // Message body area
  fillRect(grid, 1, 33, w-2, 68, P.darkRock);
  drawRect(grid, 2, 34, w-3, 67, P.stoneGray);
  // Cursor blink line
  vLine(grid, 5, 37, 41, P.paleWater);
  // Placeholder text lines
  hLine(grid, 5, 70, 38, P.midGray);
  hLine(grid, 5, 65, 43, P.midGray);
  hLine(grid, 5, 55, 48, P.midGray);

  // Attachment area
  hLine(grid, 1, w-2, 69, P.stoneGray);
  fillRect(grid, 1, 70, w-2, 80, P.black);
  // "Attach:" label
  hLine(grid, 4, 22, 73, P.midGray);
  // Attachment slot (empty, dashed border)
  drawRect(grid, 26, 71, 49, 79, P.stoneGray);
  // Plus icon in slot
  hLine(grid, 35, 40, 75, P.midGray);
  vLine(grid, 37, 73, 77, P.midGray);

  // Bottom action bar
  fillRect(grid, 1, h-14, w-2, h-2, P.stoneGray);
  hLine(grid, 1, w-2, h-14, P.midGray);
  // Send button (green = positive action)
  fillRect(grid, w-34, h-12, w-4, h-4, P.forestGreen);
  drawRect(grid, w-34, h-12, w-4, h-4, P.leafGreen);
  hLine(grid, w-28, w-10, h-8, P.nearWhite); // "Send" text
  // Cancel button
  fillRect(grid, 4, h-12, 34, h-4, P.stoneGray);
  drawRect(grid, 4, h-12, 34, h-4, P.midGray);
  hLine(grid, 10, 28, h-8, P.lightStone); // "Cancel" text

  save(w, h, grid, path.join(UI, 'mail', 'ui_panel_mail_compose.png'));
}

// ========================================================================
// 5. ATTACHMENT PREVIEW SLOT (24x24)
// ========================================================================
console.log('\n=== Attachment Preview Slot (24x24) ===');
{
  const w = 24, h = 24;
  const grid = makeGrid(w, h);

  // Outer border (rounded corners)
  hLine(grid, 2, w-3, 0, P.stoneGray);
  hLine(grid, 2, w-3, h-1, P.stoneGray);
  vLine(grid, 0, 2, h-3, P.stoneGray);
  vLine(grid, w-1, 2, h-3, P.stoneGray);
  grid[1][1] = P.stoneGray; grid[1][w-2] = P.stoneGray;
  grid[h-2][1] = P.stoneGray; grid[h-2][w-2] = P.stoneGray;
  grid[0][1] = P.stoneGray; grid[0][w-2] = P.stoneGray;
  grid[1][0] = P.stoneGray; grid[1][w-1] = P.stoneGray;
  grid[h-2][0] = P.stoneGray; grid[h-2][w-1] = P.stoneGray;
  grid[h-1][1] = P.stoneGray; grid[h-1][w-2] = P.stoneGray;

  // Inner fill
  fillRect(grid, 2, 1, w-3, h-2, P.darkRock);
  fillRect(grid, 1, 2, w-2, h-3, P.darkRock);

  // Item silhouette placeholder (slightly visible center shape)
  fillRect(grid, 8, 6, 15, 17, P.stoneGray);
  drawRect(grid, 8, 6, 15, 17, P.midGray);

  // Highlight corners (indicates interactive slot)
  grid[2][2] = P.playerBlue; grid[2][3] = P.playerBlue;
  grid[3][2] = P.playerBlue;
  grid[2][w-3] = P.playerBlue; grid[2][w-4] = P.playerBlue;
  grid[3][w-3] = P.playerBlue;
  grid[h-3][2] = P.playerBlue; grid[h-3][3] = P.playerBlue;
  grid[h-4][2] = P.playerBlue;
  grid[h-3][w-3] = P.playerBlue; grid[h-3][w-4] = P.playerBlue;
  grid[h-4][w-3] = P.playerBlue;

  save(w, h, grid, path.join(UI, 'mail', 'ui_mail_attachment_slot.png'));
}

// ========================================================================
// 6. TOAST NOTIFICATION POPUP FRAME (80x20)
//    Appears at top of screen for real-time alerts
// ========================================================================
console.log('\n=== Toast Notification Popup (80x20) ===');
{
  const w = 80, h = 20;
  const grid = makeGrid(w, h);

  // Background fill (dark with transparency feel)
  fillRect(grid, 1, 1, w-2, h-2, P.darkRock);

  // Border (rounded corners)
  hLine(grid, 2, w-3, 0, P.playerBlue);
  hLine(grid, 2, w-3, h-1, P.playerBlue);
  vLine(grid, 0, 2, h-3, P.playerBlue);
  vLine(grid, w-1, 2, h-3, P.playerBlue);
  // Corner pixels
  grid[1][1] = P.playerBlue; grid[1][w-2] = P.playerBlue;
  grid[h-2][1] = P.playerBlue; grid[h-2][w-2] = P.playerBlue;
  grid[0][1] = P.oceanBlue; grid[0][w-2] = P.oceanBlue;
  grid[1][0] = P.oceanBlue; grid[1][w-1] = P.oceanBlue;
  grid[h-2][0] = P.oceanBlue; grid[h-2][w-1] = P.oceanBlue;
  grid[h-1][1] = P.oceanBlue; grid[h-1][w-2] = P.oceanBlue;

  // Inner highlight line at top
  hLine(grid, 2, w-3, 1, P.deepOcean);

  // Icon area (left side — mail bell mini icon)
  fillRect(grid, 3, 3, 16, 16, P.black);
  drawRect(grid, 3, 3, 16, 16, P.stoneGray);
  // Mini bell shape inside
  hLine(grid, 7, 12, 5, P.gold);
  hLine(grid, 6, 13, 6, P.gold);
  fillRect(grid, 6, 7, 13, 10, P.gold);
  hLine(grid, 5, 14, 11, P.darkGold);
  hLine(grid, 5, 14, 12, P.darkGold);
  grid[13][9] = P.dirt; grid[13][10] = P.dirt;
  // Red dot on bell
  grid[4][13] = P.brightRed; grid[4][14] = P.brightRed;
  grid[5][14] = P.brightRed;

  // Message text area (placeholder lines)
  hLine(grid, 20, 65, 6, P.nearWhite); // Title line
  hLine(grid, 20, 72, 10, P.lightStone); // Detail line 1
  hLine(grid, 20, 55, 14, P.midGray); // Detail line 2

  // Dismiss X button (right side)
  grid[6][w-7] = P.lightStone; grid[6][w-5] = P.lightStone;
  grid[7][w-6] = P.lightStone;
  grid[8][w-7] = P.lightStone; grid[8][w-5] = P.lightStone;

  save(w, h, grid, path.join(UI, 'mail', 'ui_toast_notification.png'));
}

// ========================================================================
// 7. VFX — Mail received notification sparkle (16x16, 6 frames)
// ========================================================================
console.log('\n=== Mail VFX Sparkle (16x16, 6 frames) ===');
{
  const fw = 16, fh = 16;
  const w = fw * 6, h = fh; // 6 frames
  const grid = makeGrid(w, h);

  for (let frame = 0; frame < 6; frame++) {
    const ox = frame * fw;
    const intensity = [0.2, 0.5, 1.0, 0.8, 0.4, 0.1][frame];

    // Expanding ring of sparkles
    const radius = Math.floor(2 + frame * 1.2);
    const cx = 7, cy = 7;

    // Center glow (envelope icon hint)
    if (frame < 5) {
      grid[cy][ox + cx] = P.brightYellow;
      grid[cy][ox + cx + 1] = P.brightYellow;
      grid[cy + 1][ox + cx] = P.gold;
      grid[cy + 1][ox + cx + 1] = P.gold;
    }

    // Sparkle particles at cardinal directions
    if (intensity > 0.3) {
      const sparkColor = intensity > 0.7 ? P.brightYellow : P.gold;
      const r = Math.min(radius, 6);
      // N
      if (cy - r >= 0) grid[cy - r][ox + cx] = sparkColor;
      // S
      if (cy + r < fh) grid[cy + r][ox + cx + 1] = sparkColor;
      // E
      if (cx + r < fw) grid[cy][ox + cx + r] = sparkColor;
      // W
      if (cx - r >= 0) grid[cy + 1][ox + cx - r] = sparkColor;
    }

    // Secondary sparkles (diagonals)
    if (intensity > 0.5) {
      const r2 = Math.min(Math.floor(radius * 0.7), 5);
      const sp = intensity > 0.8 ? P.paleHighlight : P.gold;
      if (cy - r2 >= 0 && cx + r2 < fw) grid[cy - r2][ox + cx + r2] = sp;
      if (cy - r2 >= 0 && cx - r2 >= 0) grid[cy - r2][ox + cx - r2] = sp;
      if (cy + r2 < fh && cx + r2 < fw) grid[cy + r2][ox + cx + r2] = sp;
      if (cy + r2 < fh && cx - r2 >= 0) grid[cy + r2][ox + cx - r2] = sp;
    }
  }

  save(w, h, grid, path.join(ASSETS, 'vfx', 'vfx_mail_received.png'));
}

console.log('\n=== All mailbox & notification assets generated! ===');
console.log('\nAsset summary:');
console.log('  Sprites:');
console.log('    sprites/npcs/char_npc_mailbox.png — 32x24 (2-frame idle spritesheet, 16x24 per frame)');
console.log('  UI Icons:');
console.log('    ui/hud/icon_mail_bell.png — 16x16 (notification bell)');
console.log('    ui/hud/icon_mail_bell_unread.png — 16x16 (bell with unread badge)');
console.log('    ui/icons/icon_mail_letter_unread.png — 16x16 (sealed envelope)');
console.log('    ui/icons/icon_mail_letter_read.png — 16x16 (opened envelope)');
console.log('    ui/icons/icon_mail_package.png — 16x16 (package with attachment)');
console.log('    ui/icons/icon_mail_system.png — 16x16 (system/gear notice)');
console.log('    ui/icons/icon_mail_guild.png — 16x16 (guild shield bulletin)');
console.log('  UI Panels:');
console.log('    ui/mail/ui_panel_mail_inbox.png — 96x128 (inbox list view)');
console.log('    ui/mail/ui_panel_mail_detail.png — 96x128 (message detail view)');
console.log('    ui/mail/ui_panel_mail_compose.png — 96x96 (compose frame)');
console.log('    ui/mail/ui_mail_attachment_slot.png — 24x24 (attachment preview slot)');
console.log('    ui/mail/ui_toast_notification.png — 80x20 (toast popup frame)');
console.log('  VFX:');
console.log('    vfx/vfx_mail_received.png — 96x16 (6-frame notification sparkle)');
