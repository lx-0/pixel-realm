#!/usr/bin/env node
/**
 * PIX-183: Generate 12 missing art assets referenced in BootScene.ts
 *
 * All assets follow the 32-color master palette, pixel art style.
 * NPC sprites: 16x24 per frame, 4-frame idle spritesheet (64x24)
 * Icons/pickups: 16x16
 * Glow borders: 32x32
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUB = path.join(ROOT, 'public', 'assets');
const ASSETS = path.join(ROOT, 'assets');

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  transparent: [0, 0, 0, 0],
  // Skin
  skin:        [0xD4, 0xA5, 0x73, 255],
  skinShadow:  [0xB0, 0x82, 0x55, 255],
  // Browns
  brown:       [0x8B, 0x5E, 0x3C, 255],
  brownDark:   [0x5C, 0x3A, 0x1E, 255],
  brownLight:  [0xA0, 0x7A, 0x50, 255],
  // Greens
  green:       [0x3A, 0x7D, 0x44, 255],
  greenDark:   [0x2A, 0x5C, 0x30, 255],
  greenLight:  [0x5A, 0xB0, 0x5A, 255],
  // Blues
  blue:        [0x2A, 0x7A, 0xC0, 255],
  blueDark:    [0x1A, 0x4A, 0x7A, 255],
  blueLight:   [0x5A, 0xAA, 0xE0, 255],
  deepBlue:    [0x1A, 0x1A, 0x4E, 255],
  // Purples
  purple:      [0x90, 0x50, 0xE0, 255],
  purpleDark:  [0x60, 0x30, 0xA0, 255],
  purpleLight: [0xB0, 0x70, 0xFF, 255],
  magenta:     [0xC0, 0x40, 0x90, 255],
  pink:        [0xE0, 0x80, 0xB0, 255],
  // Golds
  gold:        [0xE8, 0xB8, 0x00, 255],
  goldDark:    [0xB8, 0x92, 0x0A, 255],
  goldLight:   [0xFF, 0xD7, 0x40, 255],
  // Greys
  grey:        [0x80, 0x80, 0x80, 255],
  greyDark:    [0x50, 0x50, 0x50, 255],
  greyLight:   [0xAA, 0xAA, 0xAA, 255],
  // Whites
  white:       [0xFF, 0xFF, 0xFF, 255],
  whiteDim:    [0xDD, 0xDD, 0xDD, 255],
  // Black
  black:       [0x10, 0x10, 0x10, 255],
  outline:     [0x22, 0x22, 0x22, 255],
  // Water
  water:       [0x3B, 0x82, 0xF6, 255],
  waterDark:   [0x1E, 0x60, 0xC0, 255],
  waterLight:  [0x7D, 0xB8, 0xFF, 255],
  // Red
  red:         [0xE0, 0x40, 0x40, 255],
  // Tan
  tan:         [0xC8, 0xB0, 0x80, 255],
  tanDark:     [0xA0, 0x88, 0x60, 255],
};

function rgba(c) {
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3] / 255})`;
}

function setPixel(ctx, x, y, color) {
  if (color[3] === 0) return;
  ctx.fillStyle = rgba(color);
  ctx.fillRect(x, y, 1, 1);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function saveCanvas(canvas, ...paths) {
  const buf = canvas.toBuffer('image/png');
  for (const p of paths) {
    const full = path.isAbsolute(p) ? p : path.join(ROOT, p);
    ensureDir(full);
    fs.writeFileSync(full, buf);
    console.log(`  -> ${path.relative(ROOT, full)} (${buf.length} bytes)`);
  }
}

// ── NPC Sprite helpers ──────────────────────────────────────────────────────
// Draw a 16x24 NPC character at (ox, oy) on context
// bodySpec: { hat, hair, face, shirt, pants, shoes, accessory }

function drawNpcBase(ctx, ox, oy, spec, frameIdx) {
  const O = C.outline;
  const s = spec;
  // Slight y-shift for idle animation
  const bob = (frameIdx === 1 || frameIdx === 3) ? -1 : 0;

  // ── Head row 0-7 ──
  // Hat (rows 0-3)
  if (s.hat) {
    // Hat brim
    for (let x = 4; x <= 11; x++) setPixel(ctx, ox + x, oy + 0 + bob, O);
    for (let x = 3; x <= 12; x++) setPixel(ctx, ox + x, oy + 1 + bob, s.hat);
    // Hat body
    for (let x = 4; x <= 11; x++) setPixel(ctx, ox + x, oy + 2 + bob, s.hat);
    for (let x = 5; x <= 10; x++) setPixel(ctx, ox + x, oy + 3 + bob, s.hatDark || s.hat);
  } else if (s.hair) {
    // Hair instead of hat
    for (let x = 5; x <= 10; x++) setPixel(ctx, ox + x, oy + 0 + bob, s.hair);
    for (let x = 4; x <= 11; x++) setPixel(ctx, ox + x, oy + 1 + bob, s.hair);
    for (let x = 4; x <= 11; x++) setPixel(ctx, ox + x, oy + 2 + bob, s.hair);
    setPixel(ctx, ox + 4, oy + 3 + bob, s.hair);
    setPixel(ctx, ox + 11, oy + 3 + bob, s.hair);
  }

  // Face (rows 3-7)
  for (let x = 5; x <= 10; x++) setPixel(ctx, ox + x, oy + 4 + bob, s.face);
  for (let x = 5; x <= 10; x++) setPixel(ctx, ox + x, oy + 5 + bob, s.face);
  // Eyes
  setPixel(ctx, ox + 6, oy + 5 + bob, C.black);
  setPixel(ctx, ox + 9, oy + 5 + bob, C.black);
  for (let x = 5; x <= 10; x++) setPixel(ctx, ox + x, oy + 6 + bob, s.faceShadow || C.skinShadow);
  for (let x = 6; x <= 9; x++) setPixel(ctx, ox + x, oy + 7 + bob, s.faceShadow || C.skinShadow);

  // ── Torso rows 8-15 ──
  // Neck
  setPixel(ctx, ox + 7, oy + 8, s.face);
  setPixel(ctx, ox + 8, oy + 8, s.face);

  // Shirt body
  for (let y = 9; y <= 14; y++) {
    const shirtColor = (y <= 10) ? s.shirt : (s.shirtDark || s.shirt);
    for (let x = 5; x <= 10; x++) {
      setPixel(ctx, ox + x, oy + y, shirtColor);
    }
  }
  // Outline shirt sides
  setPixel(ctx, ox + 4, oy + 9, O);
  setPixel(ctx, ox + 11, oy + 9, O);
  setPixel(ctx, ox + 4, oy + 10, O);
  setPixel(ctx, ox + 11, oy + 10, O);

  // Arms
  const armShift = (frameIdx % 2 === 1) ? 1 : 0;
  setPixel(ctx, ox + 3, oy + 10 + armShift, s.face);
  setPixel(ctx, ox + 12, oy + 10 + armShift, s.face);
  setPixel(ctx, ox + 3, oy + 11 + armShift, s.face);
  setPixel(ctx, ox + 12, oy + 11 + armShift, s.face);

  // ── Legs rows 15-21 ──
  // Pants
  for (let y = 15; y <= 19; y++) {
    for (let x = 5; x <= 7; x++) setPixel(ctx, ox + x, oy + y, s.pants);
    for (let x = 8; x <= 10; x++) setPixel(ctx, ox + x, oy + y, s.pants);
  }
  // Gap between legs
  setPixel(ctx, ox + 7, oy + 18, s.pantsDark || C.brownDark);
  setPixel(ctx, ox + 8, oy + 18, s.pantsDark || C.brownDark);

  // Shoes
  for (let x = 4; x <= 7; x++) setPixel(ctx, ox + x, oy + 20, s.shoes);
  for (let x = 8; x <= 11; x++) setPixel(ctx, ox + x, oy + 20, s.shoes);
  for (let x = 4; x <= 7; x++) setPixel(ctx, ox + x, oy + 21, s.shoesDark || C.brownDark);
  for (let x = 8; x <= 11; x++) setPixel(ctx, ox + x, oy + 21, s.shoesDark || C.brownDark);
}

// ── Asset 1: char_npc_rod_vendor ─────────────────────────────────────────────
function createRodVendor() {
  console.log('Creating char_npc_rod_vendor...');
  const canvas = createCanvas(64, 24);
  const ctx = canvas.getContext('2d');

  const spec = {
    hat: C.brown, hatDark: C.brownDark,
    face: C.skin, faceShadow: C.skinShadow,
    shirt: C.green, shirtDark: C.greenDark,
    pants: C.brownLight, pantsDark: C.brownDark,
    shoes: C.brownDark, shoesDark: C.black,
  };

  for (let frame = 0; frame < 4; frame++) {
    const ox = frame * 16;
    drawNpcBase(ctx, ox, 0, spec, frame);

    // Fishing rod accessory (right side)
    const rodBob = (frame === 1 || frame === 3) ? -1 : 0;
    setPixel(ctx, ox + 13, oy(6 + rodBob), C.brownLight);
    setPixel(ctx, ox + 13, oy(7 + rodBob), C.brownLight);
    setPixel(ctx, ox + 13, oy(8 + rodBob), C.brownLight);
    setPixel(ctx, ox + 14, oy(5 + rodBob), C.brownLight);
    setPixel(ctx, ox + 14, oy(4 + rodBob), C.greyLight);
    // Rod line
    setPixel(ctx, ox + 14, oy(3 + rodBob), C.whiteDim);
    setPixel(ctx, ox + 15, oy(2 + rodBob), C.whiteDim);
  }

  saveCanvas(canvas,
    path.join(PUB, 'sprites', 'characters', 'char_npc_rod_vendor.png'),
    path.join(ASSETS, 'sprites', 'characters', 'char_npc_rod_vendor.png')
  );
}

function oy(y) { return y; } // identity helper

// Actually, the rod vendor has a bug - let me rewrite it properly.

function createRodVendorFixed() {
  console.log('Creating char_npc_rod_vendor...');
  const canvas = createCanvas(64, 24);
  const ctx = canvas.getContext('2d');

  const spec = {
    hat: C.brown, hatDark: C.brownDark,
    face: C.skin, faceShadow: C.skinShadow,
    shirt: C.green, shirtDark: C.greenDark,
    pants: C.brownLight, pantsDark: C.brownDark,
    shoes: C.brownDark, shoesDark: C.black,
  };

  for (let frame = 0; frame < 4; frame++) {
    const ox = frame * 16;
    drawNpcBase(ctx, ox, 0, spec, frame);

    // Fishing rod accessory (right side)
    const rodBob = (frame === 1 || frame === 3) ? -1 : 0;
    // Rod shaft (vertical, brown)
    setPixel(ctx, ox + 13, 6 + rodBob, C.brownLight);
    setPixel(ctx, ox + 13, 7 + rodBob, C.brownLight);
    setPixel(ctx, ox + 13, 8 + rodBob, C.brownLight);
    setPixel(ctx, ox + 13, 9 + rodBob, C.brownLight);
    // Rod tip (diagonal up)
    setPixel(ctx, ox + 14, 5 + rodBob, C.brownLight);
    setPixel(ctx, ox + 14, 4 + rodBob, C.greyLight);
    // Fishing line
    setPixel(ctx, ox + 14, 3 + rodBob, C.whiteDim);
    setPixel(ctx, ox + 15, 2 + rodBob, C.whiteDim);
  }

  saveCanvas(canvas,
    path.join(PUB, 'sprites', 'characters', 'char_npc_rod_vendor.png'),
    path.join(ASSETS, 'sprites', 'characters', 'char_npc_rod_vendor.png')
  );
}

// ── Asset 2: char_npc_stylist ────────────────────────────────────────────────
function createStylist() {
  console.log('Creating char_npc_stylist...');
  const canvas = createCanvas(64, 24);
  const ctx = canvas.getContext('2d');

  const spec = {
    hair: C.goldLight,
    face: C.skin, faceShadow: C.skinShadow,
    shirt: C.purple, shirtDark: C.purpleDark,
    pants: C.black, pantsDark: C.black,
    shoes: C.magenta, shoesDark: C.purpleDark,
  };

  for (let frame = 0; frame < 4; frame++) {
    const ox = frame * 16;
    drawNpcBase(ctx, ox, 0, spec, frame);

    // Scissors accessory (right hand)
    const bob = (frame === 1 || frame === 3) ? -1 : 0;
    setPixel(ctx, ox + 13, 9 + bob, C.greyLight);
    setPixel(ctx, ox + 14, 8 + bob, C.greyLight);
    setPixel(ctx, ox + 13, 8 + bob, C.grey);
    // Scissor handles
    setPixel(ctx, ox + 14, 9 + bob, C.red);
  }

  saveCanvas(canvas,
    path.join(PUB, 'sprites', 'characters', 'char_npc_stylist.png'),
    path.join(ASSETS, 'sprites', 'characters', 'char_npc_stylist.png')
  );
}

// ── Asset 3: frame_gold ─────────────────────────────────────────────────────
function createFrameGold() {
  console.log('Creating frame_gold...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // Outer border (gold)
  for (let x = 0; x < 16; x++) {
    setPixel(ctx, x, 0, C.goldDark);
    setPixel(ctx, x, 15, C.goldDark);
  }
  for (let y = 0; y < 16; y++) {
    setPixel(ctx, 0, y, C.goldDark);
    setPixel(ctx, 15, y, C.goldDark);
  }
  // Inner border (bright gold)
  for (let x = 1; x < 15; x++) {
    setPixel(ctx, x, 1, C.gold);
    setPixel(ctx, x, 14, C.gold);
  }
  for (let y = 1; y < 15; y++) {
    setPixel(ctx, 1, y, C.gold);
    setPixel(ctx, 14, y, C.gold);
  }
  // Highlight accents (lighter gold)
  for (let x = 2; x < 14; x++) {
    setPixel(ctx, x, 2, C.goldLight);
    setPixel(ctx, x, 13, C.goldLight);
  }
  for (let y = 2; y < 14; y++) {
    setPixel(ctx, 2, y, C.goldLight);
    setPixel(ctx, 13, y, C.goldLight);
  }
  // Corner ornaments
  setPixel(ctx, 1, 1, C.goldLight);
  setPixel(ctx, 14, 1, C.goldLight);
  setPixel(ctx, 1, 14, C.goldLight);
  setPixel(ctx, 14, 14, C.goldLight);
  // Inner area transparent (portrait shows through)

  saveCanvas(canvas,
    path.join(PUB, 'ui', 'cosmetic_shop', 'frame_gold.png'),
    path.join(ASSETS, 'ui', 'cosmetic_shop', 'frame_gold.png')
  );
}

// ── Asset 4: frame_celestial ────────────────────────────────────────────────
function createFrameCelestial() {
  console.log('Creating frame_celestial...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // Outer border (deep blue)
  for (let x = 0; x < 16; x++) {
    setPixel(ctx, x, 0, C.deepBlue);
    setPixel(ctx, x, 15, C.deepBlue);
  }
  for (let y = 0; y < 16; y++) {
    setPixel(ctx, 0, y, C.deepBlue);
    setPixel(ctx, 15, y, C.deepBlue);
  }
  // Inner border (blue)
  for (let x = 1; x < 15; x++) {
    setPixel(ctx, x, 1, C.blueDark);
    setPixel(ctx, x, 14, C.blueDark);
  }
  for (let y = 1; y < 15; y++) {
    setPixel(ctx, 1, y, C.blueDark);
    setPixel(ctx, 14, y, C.blueDark);
  }
  // Light blue accent
  for (let x = 2; x < 14; x++) {
    setPixel(ctx, x, 2, C.blueLight);
    setPixel(ctx, x, 13, C.blueLight);
  }
  for (let y = 2; y < 14; y++) {
    setPixel(ctx, 2, y, C.blueLight);
    setPixel(ctx, 13, y, C.blueLight);
  }
  // Star sparkles on corners
  setPixel(ctx, 1, 1, C.white);
  setPixel(ctx, 14, 1, C.white);
  setPixel(ctx, 1, 14, C.white);
  setPixel(ctx, 14, 14, C.white);
  // Additional stars on border
  setPixel(ctx, 7, 0, C.white);
  setPixel(ctx, 8, 0, C.white);
  setPixel(ctx, 0, 7, C.white);
  setPixel(ctx, 0, 8, C.white);
  setPixel(ctx, 15, 7, C.white);
  setPixel(ctx, 15, 8, C.white);
  setPixel(ctx, 7, 15, C.white);
  setPixel(ctx, 8, 15, C.white);

  saveCanvas(canvas,
    path.join(PUB, 'ui', 'cosmetic_shop', 'frame_celestial.png'),
    path.join(ASSETS, 'ui', 'cosmetic_shop', 'frame_celestial.png')
  );
}

// ── Asset 5: pickup ──────────────────────────────────────────────────────────
function createPickup() {
  console.log('Creating pickup...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // Green glowing orb (cool color per style guide)
  // Outer glow ring
  const glowPositions = [
    [6,3],[7,3],[8,3],[9,3],
    [4,4],[5,4],[10,4],[11,4],
    [3,5],[3,6],[3,7],[3,8],[3,9],[3,10],
    [12,5],[12,6],[12,7],[12,8],[12,9],[12,10],
    [4,11],[5,11],[10,11],[11,11],
    [6,12],[7,12],[8,12],[9,12],
  ];
  for (const [x, y] of glowPositions) setPixel(ctx, x, y, C.greenDark);

  // Body
  for (let y = 4; y <= 11; y++) {
    for (let x = 5; x <= 10; x++) {
      setPixel(ctx, x, y, C.green);
    }
  }
  for (let y = 5; y <= 10; y++) {
    setPixel(ctx, 4, y, C.green);
    setPixel(ctx, 11, y, C.green);
  }

  // Highlight
  setPixel(ctx, 6, 5, C.greenLight);
  setPixel(ctx, 7, 5, C.greenLight);
  setPixel(ctx, 6, 6, C.greenLight);
  setPixel(ctx, 7, 6, C.white);

  saveCanvas(canvas,
    path.join(ASSETS, 'sprites', 'pickups', 'pickup.png')
  );
}

// ── Asset 6: pickup_coin ─────────────────────────────────────────────────────
function createPickupCoin() {
  console.log('Creating pickup_coin...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // World coin sprite - slightly larger/bouncier than UI icon
  // Outer ring
  for (let x = 5; x <= 10; x++) {
    setPixel(ctx, x, 3, C.goldDark);
    setPixel(ctx, x, 12, C.goldDark);
  }
  for (let y = 5; y <= 10; y++) {
    setPixel(ctx, 3, y, C.goldDark);
    setPixel(ctx, 12, y, C.goldDark);
  }
  setPixel(ctx, 4, 4, C.goldDark);
  setPixel(ctx, 11, 4, C.goldDark);
  setPixel(ctx, 4, 11, C.goldDark);
  setPixel(ctx, 11, 11, C.goldDark);

  // Fill
  for (let y = 4; y <= 11; y++) {
    for (let x = 5; x <= 10; x++) {
      setPixel(ctx, x, y, C.gold);
    }
  }
  for (let y = 5; y <= 10; y++) {
    setPixel(ctx, 4, y, C.gold);
    setPixel(ctx, 11, y, C.gold);
  }

  // Dollar/coin emblem
  setPixel(ctx, 7, 5, C.goldDark);
  setPixel(ctx, 8, 5, C.goldDark);
  setPixel(ctx, 6, 6, C.goldDark);
  setPixel(ctx, 7, 7, C.goldDark);
  setPixel(ctx, 8, 7, C.goldDark);
  setPixel(ctx, 9, 8, C.goldDark);
  setPixel(ctx, 7, 9, C.goldDark);
  setPixel(ctx, 8, 9, C.goldDark);

  // Highlight
  setPixel(ctx, 5, 5, C.goldLight);
  setPixel(ctx, 6, 5, C.goldLight);
  setPixel(ctx, 5, 6, C.goldLight);

  // Sparkle
  setPixel(ctx, 4, 3, C.white);
  setPixel(ctx, 11, 3, [0xFF, 0xFF, 0xFF, 128]);

  saveCanvas(canvas,
    path.join(ASSETS, 'sprites', 'pickups', 'pickup_coin.png')
  );
}

// ── Auction glow helper ──────────────────────────────────────────────────────
function createAuctionGlow(name, baseColor, brightColor, accentColor) {
  console.log(`Creating ${name}...`);
  const canvas = createCanvas(32, 32);
  const ctx = canvas.getContext('2d');

  const dim = [...baseColor.slice(0, 3), 80];
  const med = [...baseColor.slice(0, 3), 160];
  const full = baseColor;

  // Outer glow (faint)
  for (let x = 2; x < 30; x++) {
    setPixel(ctx, x, 0, dim);
    setPixel(ctx, x, 31, dim);
  }
  for (let y = 2; y < 30; y++) {
    setPixel(ctx, 0, y, dim);
    setPixel(ctx, 31, y, dim);
  }
  setPixel(ctx, 1, 1, dim);
  setPixel(ctx, 30, 1, dim);
  setPixel(ctx, 1, 30, dim);
  setPixel(ctx, 30, 30, dim);
  for (let x = 1; x < 31; x++) {
    setPixel(ctx, x, 1, dim);
    setPixel(ctx, x, 30, dim);
  }
  for (let y = 1; y < 31; y++) {
    setPixel(ctx, 1, y, dim);
    setPixel(ctx, 30, y, dim);
  }

  // Mid glow
  for (let x = 2; x < 30; x++) {
    setPixel(ctx, x, 2, med);
    setPixel(ctx, x, 29, med);
  }
  for (let y = 2; y < 30; y++) {
    setPixel(ctx, 2, y, med);
    setPixel(ctx, 29, y, med);
  }

  // Inner border (full color)
  for (let x = 3; x < 29; x++) {
    setPixel(ctx, x, 3, full);
    setPixel(ctx, x, 28, full);
  }
  for (let y = 3; y < 29; y++) {
    setPixel(ctx, 3, y, full);
    setPixel(ctx, 28, y, full);
  }

  // Bright accent line
  for (let x = 4; x < 28; x++) {
    setPixel(ctx, x, 4, brightColor);
    setPixel(ctx, x, 27, brightColor);
  }
  for (let y = 4; y < 28; y++) {
    setPixel(ctx, 4, y, brightColor);
    setPixel(ctx, 27, y, brightColor);
  }

  // Corner sparkles
  setPixel(ctx, 3, 3, accentColor);
  setPixel(ctx, 28, 3, accentColor);
  setPixel(ctx, 3, 28, accentColor);
  setPixel(ctx, 28, 28, accentColor);

  saveCanvas(canvas,
    path.join(PUB, 'ui', 'auction', `${name}.png`),
    path.join(ASSETS, 'ui', 'auction', `${name}.png`)
  );
}

// ── Asset 10: ui_icon_bid_hammer ─────────────────────────────────────────────
function createBidHammer() {
  console.log('Creating ui_icon_bid_hammer...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // Hammer head (grey metal)
  for (let x = 4; x <= 11; x++) {
    setPixel(ctx, x, 2, C.greyDark);
    setPixel(ctx, x, 3, C.grey);
    setPixel(ctx, x, 4, C.grey);
    setPixel(ctx, x, 5, C.greyDark);
  }
  // Highlight on hammer head
  setPixel(ctx, 5, 3, C.greyLight);
  setPixel(ctx, 6, 3, C.greyLight);
  setPixel(ctx, 7, 3, C.greyLight);

  // Handle (brown)
  for (let y = 6; y <= 13; y++) {
    setPixel(ctx, 7, y, C.brown);
    setPixel(ctx, 8, y, C.brownLight);
  }

  // Base plate
  for (let x = 5; x <= 10; x++) {
    setPixel(ctx, x, 14, C.brownDark);
  }

  saveCanvas(canvas,
    path.join(PUB, 'ui', 'auction', 'ui_icon_bid_hammer.png'),
    path.join(ASSETS, 'ui', 'auction', 'ui_icon_bid_hammer.png')
  );
}

// ── Asset 11: ui_icon_gold_coin ──────────────────────────────────────────────
function createGoldCoinIcon() {
  console.log('Creating ui_icon_gold_coin...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // Coin outline
  for (let x = 4; x <= 11; x++) {
    setPixel(ctx, x, 2, C.goldDark);
    setPixel(ctx, x, 13, C.goldDark);
  }
  for (let y = 4; y <= 11; y++) {
    setPixel(ctx, 2, y, C.goldDark);
    setPixel(ctx, 13, y, C.goldDark);
  }
  setPixel(ctx, 3, 3, C.goldDark);
  setPixel(ctx, 12, 3, C.goldDark);
  setPixel(ctx, 3, 12, C.goldDark);
  setPixel(ctx, 12, 12, C.goldDark);

  // Coin body
  for (let y = 3; y <= 12; y++) {
    for (let x = 4; x <= 11; x++) {
      setPixel(ctx, x, y, C.gold);
    }
  }
  for (let y = 4; y <= 11; y++) {
    setPixel(ctx, 3, y, C.gold);
    setPixel(ctx, 12, y, C.gold);
  }

  // Inner rim
  for (let x = 5; x <= 10; x++) {
    setPixel(ctx, x, 4, C.goldLight);
  }
  for (let y = 5; y <= 10; y++) {
    setPixel(ctx, 4, y, C.goldLight);
  }

  // "G" emblem for Gold
  setPixel(ctx, 7, 6, C.goldDark);
  setPixel(ctx, 8, 6, C.goldDark);
  setPixel(ctx, 9, 6, C.goldDark);
  setPixel(ctx, 6, 7, C.goldDark);
  setPixel(ctx, 6, 8, C.goldDark);
  setPixel(ctx, 6, 9, C.goldDark);
  setPixel(ctx, 7, 9, C.goldDark);
  setPixel(ctx, 8, 9, C.goldDark);
  setPixel(ctx, 9, 9, C.goldDark);
  setPixel(ctx, 9, 8, C.goldDark);
  setPixel(ctx, 8, 8, C.goldDark);

  // Highlight
  setPixel(ctx, 5, 4, C.white);
  setPixel(ctx, 5, 5, [0xFF, 0xFF, 0xFF, 128]);

  saveCanvas(canvas,
    path.join(PUB, 'ui', 'auction', 'ui_icon_gold_coin.png'),
    path.join(ASSETS, 'ui', 'auction', 'ui_icon_gold_coin.png')
  );
}

// ── Asset 12: fishing_spot ──────────────────────────────────────────────────
function createFishingSpot() {
  console.log('Creating fishing_spot...');
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');

  // Water base circle
  for (let x = 5; x <= 10; x++) {
    setPixel(ctx, x, 4, C.waterDark);
    setPixel(ctx, x, 11, C.waterDark);
  }
  for (let y = 5; y <= 10; y++) {
    setPixel(ctx, 4, y, C.waterDark);
    setPixel(ctx, 11, y, C.waterDark);
  }
  setPixel(ctx, 4, 4, C.waterDark);
  setPixel(ctx, 11, 4, C.waterDark);
  setPixel(ctx, 4, 11, C.waterDark);
  setPixel(ctx, 11, 11, C.waterDark);

  // Water fill
  for (let y = 5; y <= 10; y++) {
    for (let x = 5; x <= 10; x++) {
      setPixel(ctx, x, y, C.water);
    }
  }

  // Ripple rings (concentric lighter rings)
  // Outer ripple
  for (let x = 2; x <= 13; x++) {
    setPixel(ctx, x, 2, C.waterLight);
    setPixel(ctx, x, 13, C.waterLight);
  }
  for (let y = 3; y <= 12; y++) {
    setPixel(ctx, 2, y, C.waterLight);
    setPixel(ctx, 13, y, C.waterLight);
  }
  setPixel(ctx, 3, 3, C.waterLight);
  setPixel(ctx, 12, 3, C.waterLight);
  setPixel(ctx, 3, 12, C.waterLight);
  setPixel(ctx, 12, 12, C.waterLight);

  // Center sparkle
  setPixel(ctx, 7, 7, C.white);
  setPixel(ctx, 8, 7, C.white);
  setPixel(ctx, 7, 8, C.white);
  setPixel(ctx, 8, 8, C.waterLight);

  // Fish silhouette hint
  setPixel(ctx, 6, 9, C.waterDark);
  setPixel(ctx, 7, 9, C.waterDark);
  setPixel(ctx, 8, 9, C.waterDark);
  setPixel(ctx, 9, 9, C.blueDark);

  saveCanvas(canvas,
    path.join(PUB, 'sprites', 'fishing', 'fishing_spot.png'),
    path.join(ASSETS, 'sprites', 'fishing', 'fishing_spot.png')
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('PIX-183: Generating 12 missing art assets\n');

  // 1. NPC sprites
  createRodVendorFixed();
  createStylist();

  // 2. Cosmetic frames
  createFrameGold();
  createFrameCelestial();

  // 3. Pickup world sprites
  createPickup();
  createPickupCoin();

  // 4. Auction glow borders
  createAuctionGlow('ui_glow_rare_auction',
    C.blue, C.blueLight, C.white);
  createAuctionGlow('ui_glow_epic_auction',
    C.purple, C.purpleLight, C.white);
  createAuctionGlow('ui_glow_legendary_auction',
    C.gold, C.goldLight, C.white);

  // 5. Auction icons
  createBidHammer();
  createGoldCoinIcon();

  // 6. Fishing
  createFishingSpot();

  console.log('\nDone! 12 assets created.');
}

main();
