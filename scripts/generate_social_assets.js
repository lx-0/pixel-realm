#!/usr/bin/env node
/**
 * Generate social features and emote art assets for PIX-331.
 * All assets use the 32-color master palette from ART-STYLE-GUIDE.md.
 * 16x16 pixel art, PNG output with nearest-neighbor intent.
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Master palette
const P = {
  // Neutrals
  black:      [0x0d, 0x0d, 0x0d],
  darkRock:   [0x2b, 0x2b, 0x2b],
  stoneGray:  [0x4a, 0x4a, 0x4a],
  midGray:    [0x6e, 0x6e, 0x6e],
  lightStone: [0x96, 0x96, 0x96],
  paleGray:   [0xc8, 0xc8, 0xc8],
  nearWhite:  [0xf0, 0xf0, 0xf0],
  // Warm earth
  deepSoil:   [0x3b, 0x20, 0x10],
  richEarth:  [0x6b, 0x3a, 0x1f],
  dirt:       [0x8b, 0x5c, 0x2a],
  sand:       [0xb8, 0x84, 0x3f],
  desertGold: [0xd4, 0xa8, 0x5a],
  paleSand:   [0xe8, 0xd0, 0x8a],
  // Greens
  deepForest: [0x1a, 0x3a, 0x1a],
  forestGreen:[0x2d, 0x6e, 0x2d],
  leafGreen:  [0x4c, 0x9b, 0x4c],
  brightGrass:[0x78, 0xc8, 0x78],
  lightFoliage:[0xa8, 0xe4, 0xa0],
  // Cyan/Blue
  deepOcean:  [0x0a, 0x1a, 0x3a],
  oceanBlue:  [0x1a, 0x4a, 0x8a],
  skyBlue:    [0x2a, 0x7a, 0xc0],
  playerBlue: [0x50, 0xa8, 0xe8],
  paleWater:  [0x90, 0xd0, 0xf8],
  highlight:  [0xc8, 0xf0, 0xff],
  // Red/Orange
  deepBlood:  [0x5a, 0x0a, 0x0a],
  enemyRed:   [0xa0, 0x10, 0x10],
  brightRed:  [0xd4, 0x20, 0x20],
  fireOrange: [0xf0, 0x60, 0x20],
  ember:      [0xf8, 0xa0, 0x60],
  // Yellow/Gold
  darkGold:   [0xa8, 0x70, 0x00],
  gold:       [0xe8, 0xb8, 0x00],
  brightYellow:[0xff, 0xe0, 0x40],
  paleHighlight:[0xff, 0xf8, 0xa0],
  // Purple
  deepMagic:  [0x1a, 0x0a, 0x3a],
  magicPurple:[0x5a, 0x20, 0xa0],
  manaViolet: [0x90, 0x50, 0xe0],
  spellGlow:  [0xd0, 0x90, 0xff],
};

const T = null; // transparent

// Minimal PNG encoder using only Node.js built-in zlib
function writePNG(w, h, pixels) {
  // Build raw RGBA scanlines with filter byte (0 = None)
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const offset = y * (1 + w * 4);
    raw[offset] = 0; // filter: None
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

  // CRC32 table
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

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

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

const BASE = path.join(__dirname, '..', 'assets', 'ui');

// ========================================================================
// 1. EMOTE SPRITES (16x16 bubble icons)
//    White/pale gray speech-bubble shape with colored icon inside
// ========================================================================
console.log('\n=== Emote Sprites (16x16) ===');

// Helper: build a 16x16 emote with a rounded bubble background and inner icon
function makeEmote(innerPixels, bubbleFill = P.nearWhite, bubbleOutline = P.paleGray) {
  const b = bubbleOutline;
  const f = bubbleFill;
  // 16x16 rounded speech-bubble template
  // Rows 0-12: rounded rect bubble, Row 13-14: tail, Row 15: empty
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Bubble outline + fill (rows 1-11)
  // Row 0: top edge
  grid[0] = [T,T,T,b,b,b,b,b,b,b,b,b,b,T,T,T];
  grid[1] = [T,T,b,f,f,f,f,f,f,f,f,f,f,b,T,T];
  grid[2] = [T,b,f,f,f,f,f,f,f,f,f,f,f,f,b,T];
  for (let y = 3; y <= 9; y++) {
    grid[y] = [T,b,f,f,f,f,f,f,f,f,f,f,f,f,b,T];
  }
  grid[10]= [T,b,f,f,f,f,f,f,f,f,f,f,f,f,b,T];
  grid[11]= [T,T,b,f,f,f,f,f,f,f,f,f,f,b,T,T];
  grid[12]= [T,T,T,b,b,b,b,b,b,b,b,b,b,T,T,T];
  // Tail (pointing down-center)
  grid[13]= [T,T,T,T,T,T,b,f,f,b,T,T,T,T,T,T];
  grid[14]= [T,T,T,T,T,T,T,b,b,T,T,T,T,T,T,T];
  grid[15]= [T,T,T,T,T,T,T,T,T,T,T,T,T,T,T,T];

  // Overlay inner icon (offset 3,3 within the bubble, 10x8 area)
  for (const [ix, iy, color] of innerPixels) {
    if (iy + 2 < 13 && ix + 3 < 15) {
      grid[iy + 2][ix + 3] = color;
    }
  }
  return grid;
}

// Wave emote — a hand waving (cyan/player color)
const wavePixels = [
  // Simple waving hand shape
  [2,1,P.playerBlue],[3,1,P.playerBlue],[4,1,P.playerBlue],
  [1,2,P.playerBlue],[5,2,P.playerBlue],[7,2,P.playerBlue],
  [1,3,P.playerBlue],[5,3,P.playerBlue],[6,3,P.playerBlue],[7,3,P.playerBlue],
  [2,4,P.playerBlue],[3,4,P.playerBlue],[4,4,P.playerBlue],[5,4,P.playerBlue],
  [3,5,P.skyBlue],[4,5,P.skyBlue],[5,5,P.playerBlue],
  [3,6,P.skyBlue],[4,6,P.skyBlue],
  [3,7,P.skyBlue],[4,7,P.skyBlue],
  // Motion lines
  [8,1,P.paleGray],[9,2,P.paleGray],[8,3,P.paleGray],
];
save(16, 16, makeEmote(wavePixels), path.join(BASE, 'emotes', 'icon_emote_wave.png'));

// Laugh emote — a laughing face (gold/yellow)
const laughPixels = [
  // Eyes squinted (happy)
  [2,2,P.gold],[3,2,P.gold],  [6,2,P.gold],[7,2,P.gold],
  // Open mouth laughing
  [3,4,P.darkGold],[4,4,P.darkGold],[5,4,P.darkGold],[6,4,P.darkGold],
  [2,5,P.darkGold],[3,5,P.brightYellow],[4,5,P.brightYellow],[5,5,P.brightYellow],[6,5,P.brightYellow],[7,5,P.darkGold],
  [3,6,P.darkGold],[4,6,P.darkGold],[5,6,P.darkGold],[6,6,P.darkGold],
  // Tear of laughter
  [8,3,P.playerBlue],
];
save(16, 16, makeEmote(laughPixels), path.join(BASE, 'emotes', 'icon_emote_laugh.png'));

// Angry emote — angry face (red)
const angryPixels = [
  // Angry eyebrows (angled down)
  [1,1,P.brightRed],[2,2,P.brightRed],  [8,1,P.brightRed],[7,2,P.brightRed],
  // Eyes
  [2,3,P.enemyRed],[3,3,P.enemyRed],  [6,3,P.enemyRed],[7,3,P.enemyRed],
  // Angry mouth (gritted)
  [3,5,P.brightRed],[4,5,P.enemyRed],[5,5,P.brightRed],[6,5,P.enemyRed],
  [3,6,P.enemyRed],[4,6,P.brightRed],[5,6,P.enemyRed],[6,6,P.brightRed],
  // Anger symbol top-right
  [8,0,P.brightRed],[9,1,P.brightRed],[8,1,P.brightRed],
];
save(16, 16, makeEmote(angryPixels), path.join(BASE, 'emotes', 'icon_emote_angry.png'));

// Sad emote — sad face (blue)
const sadPixels = [
  // Sad eyes
  [2,2,P.oceanBlue],[3,2,P.oceanBlue],  [6,2,P.oceanBlue],[7,2,P.oceanBlue],
  // Tears
  [3,3,P.playerBlue],[7,3,P.playerBlue],
  [3,4,P.paleWater],[7,4,P.paleWater],
  // Frown
  [3,6,P.oceanBlue],[4,5,P.oceanBlue],[5,5,P.oceanBlue],[6,6,P.oceanBlue],
];
save(16, 16, makeEmote(sadPixels), path.join(BASE, 'emotes', 'icon_emote_sad.png'));

// Cheer emote — raised arms with sparkles (gold)
const cheerPixels = [
  // Sparkle top
  [4,0,P.brightYellow],[5,0,P.brightYellow],
  // Raised arms
  [1,1,P.gold],[8,1,P.gold],
  [2,2,P.gold],[7,2,P.gold],
  [3,3,P.gold],[6,3,P.gold],
  // Body
  [4,3,P.playerBlue],[5,3,P.playerBlue],
  [4,4,P.playerBlue],[5,4,P.playerBlue],
  [4,5,P.skyBlue],[5,5,P.skyBlue],
  [4,6,P.skyBlue],[5,6,P.skyBlue],
  // Sparkles around
  [0,0,P.brightYellow],[9,0,P.brightYellow],
  [1,3,P.paleHighlight],[8,3,P.paleHighlight],
];
save(16, 16, makeEmote(cheerPixels), path.join(BASE, 'emotes', 'icon_emote_cheer.png'));

// Thumbs-up emote (green = positive)
const thumbsUpPixels = [
  // Thumb pointing up
  [4,0,P.leafGreen],[5,0,P.leafGreen],
  [4,1,P.leafGreen],[5,1,P.leafGreen],
  [4,2,P.leafGreen],[5,2,P.leafGreen],
  // Fist
  [2,3,P.leafGreen],[3,3,P.brightGrass],[4,3,P.brightGrass],[5,3,P.brightGrass],[6,3,P.leafGreen],
  [2,4,P.leafGreen],[3,4,P.brightGrass],[4,4,P.brightGrass],[5,4,P.brightGrass],[6,4,P.leafGreen],
  [2,5,P.forestGreen],[3,5,P.leafGreen],[4,5,P.leafGreen],[5,5,P.leafGreen],[6,5,P.forestGreen],
  [3,6,P.forestGreen],[4,6,P.forestGreen],[5,6,P.forestGreen],
];
save(16, 16, makeEmote(thumbsUpPixels), path.join(BASE, 'emotes', 'icon_emote_thumbsup.png'));

// Question mark emote (purple/magic)
const questionPixels = [
  [3,1,P.manaViolet],[4,1,P.manaViolet],[5,1,P.manaViolet],[6,1,P.manaViolet],
  [2,1,P.magicPurple],[7,1,P.magicPurple],
  [2,2,P.magicPurple],[7,2,P.manaViolet],
  [6,3,P.manaViolet],[7,3,P.magicPurple],
  [5,4,P.manaViolet],[6,4,P.magicPurple],
  [4,5,P.manaViolet],[5,5,P.magicPurple],
  [4,7,P.manaViolet],[5,7,P.manaViolet],
];
save(16, 16, makeEmote(questionPixels), path.join(BASE, 'emotes', 'icon_emote_question.png'));

// Exclamation mark emote (gold/yellow — quest marker color)
const exclamationPixels = [
  [4,0,P.gold],[5,0,P.gold],
  [4,1,P.brightYellow],[5,1,P.brightYellow],
  [4,2,P.brightYellow],[5,2,P.brightYellow],
  [4,3,P.brightYellow],[5,3,P.brightYellow],
  [4,4,P.gold],[5,4,P.gold],
  [4,5,P.gold],[5,5,P.gold],
  // Dot
  [4,7,P.gold],[5,7,P.gold],
];
save(16, 16, makeEmote(exclamationPixels), path.join(BASE, 'emotes', 'icon_emote_exclamation.png'));

// ========================================================================
// 2. FRIEND LIST PANEL UI
// ========================================================================
console.log('\n=== Friend List Panel UI ===');

// Friend list panel background (96x128 — matches typical MMO side-panel style)
{
  const w = 96, h = 128;
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill(P.darkRock));

  // Border (1px)
  for (let x = 0; x < w; x++) { grid[0][x] = P.playerBlue; grid[h-1][x] = P.playerBlue; }
  for (let y = 0; y < h; y++) { grid[y][0] = P.playerBlue; grid[y][w-1] = P.playerBlue; }

  // Title bar area (top 12px)
  for (let y = 1; y < 12; y++) for (let x = 1; x < w-1; x++) grid[y][x] = P.deepOcean;

  // Title text area highlight
  for (let x = 4; x < 40; x++) { grid[5][x] = P.playerBlue; grid[6][x] = P.playerBlue; }

  // Row separators (friend rows, every 16px starting at y=12)
  for (let row = 0; row < 7; row++) {
    const ry = 12 + row * 16 + 15;
    if (ry < h - 1) {
      for (let x = 1; x < w-1; x++) grid[ry][x] = P.stoneGray;
    }
  }

  // Inner panel fill
  for (let y = 12; y < h-1; y++) {
    for (let x = 1; x < w-1; x++) {
      if (grid[y][x] !== P.stoneGray) grid[y][x] = P.darkRock;
    }
  }

  save(w, h, grid, path.join(BASE, 'social', 'ui_panel_friends.png'));
}

// Add-friend button icon (16x16 — person silhouette + green plus)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Person silhouette (left-center)
  // Head
  grid[2][4] = P.playerBlue; grid[2][5] = P.playerBlue;
  grid[3][3] = P.playerBlue; grid[3][4] = P.skyBlue; grid[3][5] = P.skyBlue; grid[3][6] = P.playerBlue;
  grid[4][4] = P.playerBlue; grid[4][5] = P.playerBlue;
  // Body
  grid[6][3] = P.playerBlue; grid[6][4] = P.skyBlue; grid[6][5] = P.skyBlue; grid[6][6] = P.playerBlue;
  grid[7][2] = P.playerBlue; grid[7][3] = P.skyBlue; grid[7][4] = P.skyBlue; grid[7][5] = P.skyBlue; grid[7][6] = P.skyBlue; grid[7][7] = P.playerBlue;
  grid[8][2] = P.playerBlue; grid[8][3] = P.skyBlue; grid[8][4] = P.skyBlue; grid[8][5] = P.skyBlue; grid[8][6] = P.skyBlue; grid[8][7] = P.playerBlue;
  grid[9][3] = P.oceanBlue; grid[9][4] = P.oceanBlue; grid[9][5] = P.oceanBlue; grid[9][6] = P.oceanBlue;

  // Green "+" sign (bottom-right)
  grid[10][12] = P.leafGreen; grid[10][13] = P.leafGreen;
  grid[11][11] = P.leafGreen; grid[11][12] = P.brightGrass; grid[11][13] = P.brightGrass; grid[11][14] = P.leafGreen;
  grid[12][12] = P.leafGreen; grid[12][13] = P.leafGreen;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_friend_add.png'));
}

// Remove-friend icon (16x16 — person silhouette + red minus)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Person silhouette (same as add)
  grid[2][4] = P.playerBlue; grid[2][5] = P.playerBlue;
  grid[3][3] = P.playerBlue; grid[3][4] = P.skyBlue; grid[3][5] = P.skyBlue; grid[3][6] = P.playerBlue;
  grid[4][4] = P.playerBlue; grid[4][5] = P.playerBlue;
  grid[6][3] = P.playerBlue; grid[6][4] = P.skyBlue; grid[6][5] = P.skyBlue; grid[6][6] = P.playerBlue;
  grid[7][2] = P.playerBlue; grid[7][3] = P.skyBlue; grid[7][4] = P.skyBlue; grid[7][5] = P.skyBlue; grid[7][6] = P.skyBlue; grid[7][7] = P.playerBlue;
  grid[8][2] = P.playerBlue; grid[8][3] = P.skyBlue; grid[8][4] = P.skyBlue; grid[8][5] = P.skyBlue; grid[8][6] = P.skyBlue; grid[8][7] = P.playerBlue;
  grid[9][3] = P.oceanBlue; grid[9][4] = P.oceanBlue; grid[9][5] = P.oceanBlue; grid[9][6] = P.oceanBlue;

  // Red "-" sign (bottom-right)
  grid[11][11] = P.brightRed; grid[11][12] = P.brightRed; grid[11][13] = P.brightRed; grid[11][14] = P.brightRed;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_friend_remove.png'));
}

// Status indicators — online (green dot), offline (gray dot), away (yellow dot)
// These already exist in multiplayer/ but spec says friend list needs them in social/
// We'll create matching ones for the friend list context
{
  // Online — green dot
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));
  // 6px diameter circle centered
  for (const [x,y] of [[6,5],[7,5],[8,5],[9,5],[5,6],[6,6],[7,6],[8,6],[9,6],[10,6],[5,7],[6,7],[7,7],[8,7],[9,7],[10,7],[5,8],[6,8],[7,8],[8,8],[9,8],[10,8],[5,9],[6,9],[7,9],[8,9],[9,9],[10,9],[6,10],[7,10],[8,10],[9,10]]) {
    grid[y][x] = P.leafGreen;
  }
  // Highlight
  grid[6][7] = P.brightGrass; grid[6][8] = P.brightGrass;
  grid[7][7] = P.brightGrass;
  save(16, 16, grid, path.join(BASE, 'social', 'icon_status_online.png'));

  // Offline — gray dot
  const gOff = grid.map(r => r.map(c => c === P.leafGreen ? P.midGray : (c === P.brightGrass ? P.lightStone : c)));
  save(16, 16, gOff, path.join(BASE, 'social', 'icon_status_offline.png'));

  // Away — gold dot
  const gAway = grid.map(r => r.map(c => c === P.leafGreen ? P.gold : (c === P.brightGrass ? P.brightYellow : c)));
  save(16, 16, gAway, path.join(BASE, 'social', 'icon_status_away.png'));
}

// ========================================================================
// 3. GUILD/PARTY ICONS
// ========================================================================
console.log('\n=== Guild/Party Icons (16x16) ===');

// Party invite icon (16x16 — two person silhouettes + green arrow)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Person 1 (left)
  grid[2][2] = P.playerBlue; grid[2][3] = P.playerBlue;
  grid[3][1] = P.playerBlue; grid[3][2] = P.skyBlue; grid[3][3] = P.skyBlue; grid[3][4] = P.playerBlue;
  grid[4][2] = P.playerBlue; grid[4][3] = P.playerBlue;
  grid[6][1] = P.playerBlue; grid[6][2] = P.skyBlue; grid[6][3] = P.skyBlue; grid[6][4] = P.playerBlue;
  grid[7][0] = P.playerBlue; grid[7][1] = P.skyBlue; grid[7][2] = P.skyBlue; grid[7][3] = P.skyBlue; grid[7][4] = P.skyBlue; grid[7][5] = P.playerBlue;

  // Person 2 (right, slightly faded = incoming)
  grid[2][10] = P.skyBlue; grid[2][11] = P.skyBlue;
  grid[3][9] = P.skyBlue; grid[3][10] = P.paleWater; grid[3][11] = P.paleWater; grid[3][12] = P.skyBlue;
  grid[4][10] = P.skyBlue; grid[4][11] = P.skyBlue;
  grid[6][9] = P.skyBlue; grid[6][10] = P.paleWater; grid[6][11] = P.paleWater; grid[6][12] = P.skyBlue;
  grid[7][8] = P.skyBlue; grid[7][9] = P.paleWater; grid[7][10] = P.paleWater; grid[7][11] = P.paleWater; grid[7][12] = P.paleWater; grid[7][13] = P.skyBlue;

  // Green arrow between them (pointing right)
  grid[10][5] = P.leafGreen; grid[10][6] = P.leafGreen; grid[10][7] = P.leafGreen; grid[10][8] = P.leafGreen; grid[10][9] = P.leafGreen;
  grid[9][8] = P.leafGreen; grid[9][9] = P.brightGrass;
  grid[11][8] = P.leafGreen; grid[11][9] = P.brightGrass;
  grid[8][9] = P.leafGreen;
  grid[12][9] = P.leafGreen;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_party_invite.png'));
}

// Guild crest placeholder frame (16x16 — ornate border with empty center)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Shield shape outline (gold)
  const g = P.gold;
  const dg = P.darkGold;
  grid[0] = [T,T,T,g,g,g,g,g,g,g,g,g,g,T,T,T];
  grid[1] = [T,T,g,dg,dg,dg,dg,dg,dg,dg,dg,dg,dg,g,T,T];
  grid[2] = [T,g,dg,T,T,T,T,T,T,T,T,T,T,dg,g,T];
  for (let y = 3; y <= 8; y++) {
    grid[y] = [T,g,dg,T,T,T,T,T,T,T,T,T,T,dg,g,T];
  }
  grid[9]  = [T,T,g,dg,T,T,T,T,T,T,T,T,dg,g,T,T];
  grid[10] = [T,T,T,g,dg,T,T,T,T,T,T,dg,g,T,T,T];
  grid[11] = [T,T,T,T,g,dg,T,T,T,T,dg,g,T,T,T,T];
  grid[12] = [T,T,T,T,T,g,dg,T,T,dg,g,T,T,T,T,T];
  grid[13] = [T,T,T,T,T,T,g,dg,dg,g,T,T,T,T,T,T];
  grid[14] = [T,T,T,T,T,T,T,g,g,T,T,T,T,T,T,T];

  // Inner fill (dark to show as placeholder)
  for (let y = 3; y <= 8; y++) {
    for (let x = 3; x <= 12; x++) {
      if (grid[y][x] === T) grid[y][x] = P.deepOcean;
    }
  }
  for (let y = 9; y <= 12; y++) {
    for (let x = 0; x < 16; x++) {
      if (grid[y][x] === T) {
        // Check if inside the shield
        const leftEdge = y - 6;
        const rightEdge = 16 - leftEdge;
        if (x > leftEdge && x < rightEdge - 1) grid[y][x] = P.deepOcean;
      }
    }
  }

  save(16, 16, grid, path.join(BASE, 'social', 'icon_guild_crest_frame.png'));
}

// Kick icon (16x16 — boot/foot kicking)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Boot shape (red = negative action)
  grid[3][4] = P.brightRed; grid[3][5] = P.brightRed; grid[3][6] = P.brightRed;
  grid[4][3] = P.brightRed; grid[4][4] = P.enemyRed; grid[4][5] = P.enemyRed; grid[4][6] = P.brightRed;
  grid[5][3] = P.brightRed; grid[5][4] = P.enemyRed; grid[5][5] = P.enemyRed; grid[5][6] = P.brightRed;
  grid[6][4] = P.brightRed; grid[6][5] = P.brightRed; grid[6][6] = P.brightRed;
  grid[7][5] = P.brightRed; grid[7][6] = P.brightRed; grid[7][7] = P.brightRed;
  grid[8][6] = P.brightRed; grid[8][7] = P.enemyRed; grid[8][8] = P.brightRed;
  grid[9][7] = P.brightRed; grid[9][8] = P.enemyRed; grid[9][9] = P.brightRed;
  // Foot/boot toe
  grid[10][8] = P.brightRed; grid[10][9] = P.enemyRed; grid[10][10] = P.brightRed; grid[10][11] = P.brightRed;
  grid[11][8] = P.brightRed; grid[11][9] = P.brightRed; grid[11][10] = P.brightRed; grid[11][11] = P.brightRed; grid[11][12] = P.brightRed;
  // Impact lines
  grid[9][12] = P.fireOrange; grid[8][13] = P.fireOrange; grid[10][13] = P.fireOrange;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_guild_kick.png'));
}

// Promote icon (16x16 — upward arrow with star)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Star at top (gold)
  grid[1][7] = P.brightYellow; grid[1][8] = P.brightYellow;
  grid[2][6] = P.gold; grid[2][7] = P.brightYellow; grid[2][8] = P.brightYellow; grid[2][9] = P.gold;
  grid[3][4] = P.gold; grid[3][5] = P.gold; grid[3][6] = P.brightYellow; grid[3][7] = P.brightYellow;
  grid[3][8] = P.brightYellow; grid[3][9] = P.brightYellow; grid[3][10] = P.gold; grid[3][11] = P.gold;
  grid[4][5] = P.gold; grid[4][6] = P.brightYellow; grid[4][7] = P.brightYellow; grid[4][8] = P.brightYellow; grid[4][9] = P.brightYellow; grid[4][10] = P.gold;
  grid[5][6] = P.gold; grid[5][7] = P.gold; grid[5][8] = P.gold; grid[5][9] = P.gold;
  grid[6][5] = P.gold; grid[6][6] = P.darkGold; grid[6][9] = P.darkGold; grid[6][10] = P.gold;

  // Upward arrow (green = positive action)
  grid[8][7] = P.leafGreen; grid[8][8] = P.leafGreen;
  grid[9][6] = P.leafGreen; grid[9][7] = P.brightGrass; grid[9][8] = P.brightGrass; grid[9][9] = P.leafGreen;
  grid[10][5] = P.leafGreen; grid[10][7] = P.brightGrass; grid[10][8] = P.brightGrass; grid[10][10] = P.leafGreen;
  grid[11][7] = P.leafGreen; grid[11][8] = P.leafGreen;
  grid[12][7] = P.leafGreen; grid[12][8] = P.leafGreen;
  grid[13][7] = P.forestGreen; grid[13][8] = P.forestGreen;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_guild_promote.png'));
}

// Leave icon (16x16 — door with arrow going out)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Door frame (gray)
  for (let y = 2; y <= 13; y++) { grid[y][3] = P.stoneGray; grid[y][9] = P.stoneGray; }
  for (let x = 3; x <= 9; x++) { grid[2][x] = P.stoneGray; grid[13][x] = P.stoneGray; }
  // Door fill
  for (let y = 3; y <= 12; y++) for (let x = 4; x <= 8; x++) grid[y][x] = P.darkRock;
  // Door handle
  grid[7][7] = P.gold; grid[8][7] = P.gold;

  // Arrow going right (leaving)
  grid[7][11] = P.fireOrange; grid[7][12] = P.fireOrange; grid[7][13] = P.fireOrange; grid[7][14] = P.fireOrange;
  grid[8][11] = P.fireOrange; grid[8][12] = P.fireOrange; grid[8][13] = P.fireOrange; grid[8][14] = P.fireOrange;
  grid[6][13] = P.ember; grid[5][14] = P.ember;
  grid[9][13] = P.ember; grid[10][14] = P.ember;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_guild_leave.png'));
}

// ========================================================================
// 4. TRADE REQUEST NOTIFICATION
// ========================================================================
console.log('\n=== Trade Request Notification ===');

// Trade popup frame (80x48 — matches style of party_invite panel)
{
  const w = 80, h = 48;
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill(P.darkRock));

  // Outer border (gold = trade/quest color)
  for (let x = 0; x < w; x++) { grid[0][x] = P.gold; grid[h-1][x] = P.gold; }
  for (let y = 0; y < h; y++) { grid[y][0] = P.gold; grid[y][w-1] = P.gold; }

  // Inner border
  for (let x = 1; x < w-1; x++) { grid[1][x] = P.darkGold; grid[h-2][x] = P.darkGold; }
  for (let y = 1; y < h-1; y++) { grid[y][1] = P.darkGold; grid[y][w-2] = P.darkGold; }

  // Title area
  for (let y = 2; y < 12; y++) for (let x = 2; x < w-2; x++) grid[y][x] = P.deepOcean;

  // Title text placeholder bar
  for (let x = 10; x < 50; x++) { grid[5][x] = P.gold; grid[6][x] = P.gold; grid[7][x] = P.gold; }

  // Content area
  for (let y = 12; y < h-14; y++) for (let x = 2; x < w-2; x++) grid[y][x] = P.darkRock;

  // Player name placeholder
  for (let x = 10; x < 60; x++) { grid[16][x] = P.stoneGray; grid[17][x] = P.stoneGray; }

  // Divider line
  for (let x = 4; x < w-4; x++) grid[24][x] = P.stoneGray;

  // Button area — two buttons side by side
  // Accept button (left, green border)
  for (let x = 8; x < 36; x++) {
    grid[28][x] = P.leafGreen; grid[40][x] = P.leafGreen;
  }
  for (let y = 28; y <= 40; y++) { grid[y][8] = P.leafGreen; grid[y][35] = P.leafGreen; }
  for (let y = 29; y < 40; y++) for (let x = 9; x < 35; x++) grid[y][x] = P.deepForest;
  // Checkmark in accept button
  grid[33][15] = P.brightGrass; grid[34][16] = P.brightGrass; grid[35][17] = P.brightGrass;
  grid[34][18] = P.brightGrass; grid[33][19] = P.brightGrass; grid[32][20] = P.brightGrass;
  grid[31][21] = P.brightGrass;
  // Text placeholder
  for (let x = 23; x < 33; x++) { grid[33][x] = P.leafGreen; grid[34][x] = P.leafGreen; }

  // Decline button (right, red border)
  for (let x = 44; x < 72; x++) {
    grid[28][x] = P.brightRed; grid[40][x] = P.brightRed;
  }
  for (let y = 28; y <= 40; y++) { grid[y][44] = P.brightRed; grid[y][71] = P.brightRed; }
  for (let y = 29; y < 40; y++) for (let x = 45; x < 71; x++) grid[y][x] = P.deepBlood;
  // X in decline button
  grid[32][51] = P.brightRed; grid[33][52] = P.brightRed; grid[34][53] = P.brightRed; grid[35][54] = P.brightRed;
  grid[35][51] = P.brightRed; grid[34][52] = P.brightRed; grid[33][53] = P.brightRed; grid[32][54] = P.brightRed;
  // Text placeholder
  for (let x = 58; x < 68; x++) { grid[33][x] = P.brightRed; grid[34][x] = P.brightRed; }

  save(w, h, grid, path.join(BASE, 'social', 'ui_popup_trade_request.png'));
}

// Accept button icon (16x16 — green checkmark)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Border
  for (let x = 1; x < 15; x++) { grid[1][x] = P.leafGreen; grid[14][x] = P.leafGreen; }
  for (let y = 1; y <= 14; y++) { grid[y][1] = P.leafGreen; grid[y][14] = P.leafGreen; }
  // Fill
  for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) grid[y][x] = P.deepForest;
  // Checkmark
  grid[9][4] = P.brightGrass;
  grid[10][5] = P.brightGrass;
  grid[11][6] = P.brightGrass;
  grid[10][7] = P.brightGrass;
  grid[9][8] = P.brightGrass;
  grid[8][9] = P.brightGrass;
  grid[7][10] = P.brightGrass;
  grid[6][11] = P.brightGrass;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_btn_accept.png'));
}

// Decline button icon (16x16 — red X)
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Border
  for (let x = 1; x < 15; x++) { grid[1][x] = P.brightRed; grid[14][x] = P.brightRed; }
  for (let y = 1; y <= 14; y++) { grid[y][1] = P.brightRed; grid[y][14] = P.brightRed; }
  // Fill
  for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) grid[y][x] = P.deepBlood;
  // X
  grid[4][4] = P.brightRed; grid[5][5] = P.brightRed; grid[6][6] = P.brightRed; grid[7][7] = P.brightRed;
  grid[8][8] = P.brightRed; grid[9][9] = P.brightRed; grid[10][10] = P.brightRed; grid[11][11] = P.brightRed;
  grid[4][11] = P.brightRed; grid[5][10] = P.brightRed; grid[6][9] = P.brightRed; grid[7][8] = P.brightRed;
  grid[8][7] = P.brightRed; grid[9][6] = P.brightRed; grid[10][5] = P.brightRed; grid[11][4] = P.brightRed;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_btn_decline.png'));
}

// ========================================================================
// 5. PLAYER INTERACTION MENU
// ========================================================================
console.log('\n=== Player Interaction Menu ===');

// Contextual popup frame (80x80 — holds 5 menu options)
{
  const w = 80, h = 80;
  const grid = [];
  for (let y = 0; y < h; y++) grid.push(new Array(w).fill(P.darkRock));

  // Border (player blue = friendly interaction)
  for (let x = 0; x < w; x++) { grid[0][x] = P.playerBlue; grid[h-1][x] = P.playerBlue; }
  for (let y = 0; y < h; y++) { grid[y][0] = P.playerBlue; grid[y][w-1] = P.playerBlue; }
  // Inner border
  for (let x = 1; x < w-1; x++) { grid[1][x] = P.oceanBlue; grid[h-2][x] = P.oceanBlue; }
  for (let y = 1; y < h-1; y++) { grid[y][1] = P.oceanBlue; grid[y][w-2] = P.oceanBlue; }

  // Fill
  for (let y = 2; y < h-2; y++) for (let x = 2; x < w-2; x++) grid[y][x] = P.darkRock;

  // 5 menu rows (each 14px tall, with 2px padding)
  for (let i = 0; i < 5; i++) {
    const ry = 4 + i * 15;
    // Row background
    for (let y = ry; y < ry + 12; y++) {
      for (let x = 4; x < w - 4; x++) {
        grid[y][x] = P.black;
      }
    }
    // Left icon area
    for (let y = ry + 1; y < ry + 11; y++) {
      for (let x = 6; x < 16; x++) {
        grid[y][x] = P.deepOcean;
      }
    }
    // Text placeholder
    for (let x = 20; x < 60; x++) {
      grid[ry + 4][x] = P.paleGray;
      grid[ry + 5][x] = P.paleGray;
      grid[ry + 6][x] = P.paleGray;
    }
    // Right arrow
    grid[ry + 4][68] = P.stoneGray;
    grid[ry + 5][68] = P.stoneGray; grid[ry + 5][69] = P.stoneGray;
    grid[ry + 6][68] = P.stoneGray;
  }

  save(w, h, grid, path.join(BASE, 'social', 'ui_popup_interaction_menu.png'));
}

// Menu option icons (16x16 each)
// Inspect icon — magnifying glass
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Lens circle
  grid[2][5] = P.playerBlue; grid[2][6] = P.playerBlue; grid[2][7] = P.playerBlue; grid[2][8] = P.playerBlue;
  grid[3][4] = P.playerBlue; grid[3][9] = P.playerBlue;
  grid[4][3] = P.playerBlue; grid[4][10] = P.playerBlue;
  grid[5][3] = P.playerBlue; grid[5][10] = P.playerBlue;
  grid[6][3] = P.playerBlue; grid[6][10] = P.playerBlue;
  grid[7][3] = P.playerBlue; grid[7][10] = P.playerBlue;
  grid[8][4] = P.playerBlue; grid[8][9] = P.playerBlue;
  grid[9][5] = P.playerBlue; grid[9][6] = P.playerBlue; grid[9][7] = P.playerBlue; grid[9][8] = P.playerBlue;
  // Inner highlight
  grid[4][5] = P.paleWater; grid[4][6] = P.paleWater;
  grid[5][5] = P.paleWater;
  // Handle
  grid[10][9] = P.skyBlue; grid[11][10] = P.skyBlue; grid[12][11] = P.skyBlue; grid[13][12] = P.skyBlue;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_menu_inspect.png'));
}

// Invite icon — envelope with plus
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Envelope body
  for (let x = 2; x <= 13; x++) { grid[4][x] = P.playerBlue; grid[11][x] = P.playerBlue; }
  for (let y = 4; y <= 11; y++) { grid[y][2] = P.playerBlue; grid[y][13] = P.playerBlue; }
  for (let y = 5; y <= 10; y++) for (let x = 3; x <= 12; x++) grid[y][x] = P.skyBlue;
  // Envelope flap
  grid[5][3] = P.playerBlue; grid[5][12] = P.playerBlue;
  grid[6][4] = P.playerBlue; grid[6][11] = P.playerBlue;
  grid[7][5] = P.playerBlue; grid[7][6] = P.playerBlue; grid[7][9] = P.playerBlue; grid[7][10] = P.playerBlue;
  grid[8][7] = P.playerBlue; grid[8][8] = P.playerBlue;
  // Plus sign (green)
  grid[1][11] = P.leafGreen; grid[2][10] = P.leafGreen; grid[2][11] = P.brightGrass; grid[2][12] = P.leafGreen; grid[3][11] = P.leafGreen;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_menu_invite.png'));
}

// Trade icon — two arrows in opposite directions
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Arrow right (top)
  for (let x = 3; x <= 11; x++) grid[5][x] = P.gold;
  grid[4][10] = P.gold; grid[3][11] = P.gold;
  grid[6][10] = P.gold; grid[7][11] = P.gold;
  grid[4][11] = P.brightYellow; grid[6][11] = P.brightYellow;

  // Arrow left (bottom)
  for (let x = 4; x <= 12; x++) grid[10][x] = P.gold;
  grid[9][5] = P.gold; grid[8][4] = P.gold;
  grid[11][5] = P.gold; grid[12][4] = P.gold;
  grid[9][4] = P.brightYellow; grid[11][4] = P.brightYellow;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_menu_trade.png'));
}

// Whisper icon — speech bubble with "..."
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Small speech bubble
  const b = P.manaViolet;
  const f = P.deepMagic;
  grid[2] = [T,T,T,b,b,b,b,b,b,b,b,b,T,T,T,T];
  grid[3] = [T,T,b,f,f,f,f,f,f,f,f,f,b,T,T,T];
  grid[4] = [T,b,f,f,f,f,f,f,f,f,f,f,f,b,T,T];
  grid[5] = [T,b,f,f,f,f,f,f,f,f,f,f,f,b,T,T];
  grid[6] = [T,b,f,f,f,f,f,f,f,f,f,f,f,b,T,T];
  grid[7] = [T,b,f,f,f,f,f,f,f,f,f,f,f,b,T,T];
  grid[8] = [T,T,b,f,f,f,f,f,f,f,f,f,b,T,T,T];
  grid[9] = [T,T,T,b,b,b,b,b,b,b,b,b,T,T,T,T];
  grid[10]= [T,T,T,T,T,b,f,b,T,T,T,T,T,T,T,T];
  grid[11]= [T,T,T,T,T,T,b,T,T,T,T,T,T,T,T,T];

  // Dots "..."
  grid[5][4] = P.spellGlow; grid[5][5] = P.spellGlow;
  grid[5][7] = P.spellGlow; grid[5][8] = P.spellGlow;
  grid[5][10] = P.spellGlow; grid[5][11] = P.spellGlow;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_menu_whisper.png'));
}

// Duel icon — crossed swords
{
  const grid = [];
  for (let y = 0; y < 16; y++) grid.push(new Array(16).fill(T));

  // Sword 1 (top-left to bottom-right)
  grid[2][3] = P.paleGray; grid[3][4] = P.nearWhite; grid[4][5] = P.nearWhite;
  grid[5][6] = P.nearWhite; grid[6][7] = P.nearWhite; grid[7][8] = P.nearWhite;
  grid[8][9] = P.nearWhite;
  // Guard 1
  grid[9][8] = P.gold; grid[9][9] = P.gold; grid[9][10] = P.gold;
  // Handle 1
  grid[10][10] = P.dirt; grid[11][11] = P.dirt; grid[12][12] = P.richEarth;

  // Sword 2 (top-right to bottom-left)
  grid[2][12] = P.paleGray; grid[3][11] = P.nearWhite; grid[4][10] = P.nearWhite;
  grid[5][9] = P.nearWhite; grid[6][8] = P.nearWhite; grid[7][7] = P.nearWhite;
  grid[8][6] = P.nearWhite;
  // Guard 2
  grid[9][5] = P.gold; grid[9][6] = P.gold; grid[9][7] = P.gold;
  // Handle 2
  grid[10][5] = P.dirt; grid[11][4] = P.dirt; grid[12][3] = P.richEarth;

  save(16, 16, grid, path.join(BASE, 'social', 'icon_menu_duel.png'));
}

console.log('\n=== All social art assets generated! ===');
