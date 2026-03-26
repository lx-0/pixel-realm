#!/usr/bin/env node
/**
 * PIX-290: Generate class selection screen art assets
 * All assets use the 32-color master palette, pixel-perfect at native resolution.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// === 32-COLOR MASTER PALETTE ===
const P = {
  // Neutrals
  shadowBlack:   '#0d0d0d',
  darkRock:      '#2b2b2b',
  stoneGray:     '#4a4a4a',
  midGray:       '#6e6e6e',
  lightStone:    '#969696',
  paleGray:      '#c8c8c8',
  nearWhite:     '#f0f0f0',
  // Warm Earth
  deepSoil:      '#3b2010',
  richEarth:     '#6b3a1f',
  dirt:          '#8b5c2a',
  sand:          '#b8843f',
  desertGold:    '#d4a85a',
  paleSand:      '#e8d08a',
  // Greens
  deepForest:    '#1a3a1a',
  forestGreen:   '#2d6e2d',
  leafGreen:     '#4c9b4c',
  brightGrass:   '#78c878',
  lightFoliage:  '#a8e4a0',
  // Blues
  deepOcean:     '#0a1a3a',
  oceanBlue:     '#1a4a8a',
  skyBlue:       '#2a7ac0',
  playerBlue:    '#50a8e8',
  iceBlue:       '#90d0f8',
  shimmer:       '#c8f0ff',
  // Reds
  deepBlood:     '#5a0a0a',
  enemyRed:      '#a01010',
  brightRed:     '#d42020',
  fireOrange:    '#f06020',
  ember:         '#f8a060',
  // Yellows
  darkGold:      '#a87000',
  gold:          '#e8b800',
  brightYellow:  '#ffe040',
  paleHighlight: '#fff8a0',
  // Purples
  deepMagic:     '#1a0a3a',
  magicPurple:   '#5a20a0',
  manaViolet:    '#9050e0',
  spellGlow:     '#d090ff',
};

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// Helper: draw a single pixel
function px(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// Helper: draw a filled rectangle
function rect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Helper: draw a horizontal line
function hline(ctx, x, y, w, color) {
  rect(ctx, x, y, w, 1, color);
}

// Helper: draw a vertical line
function vline(ctx, x, y, h, color) {
  rect(ctx, x, y, 1, h, color);
}

// Helper: draw a bordered rectangle (1px border)
function borderedRect(ctx, x, y, w, h, borderColor, fillColor) {
  rect(ctx, x, y, w, h, borderColor);
  if (fillColor) {
    rect(ctx, x + 1, y + 1, w - 2, h - 2, fillColor);
  }
}

// Helper: save canvas as PNG
function savePng(canvas, filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
  console.log(`  ✓ ${path.relative(ASSETS_DIR, filePath)} (${canvas.width}×${canvas.height})`);
}

const PROJECT = '/host-workdir/companies/PixelForgeStudios/projects/PixelRealm';
const ASSETS_DIR = path.join(PROJECT, 'assets');
const UI_SELECT = path.join(ASSETS_DIR, 'ui', 'character_select');
const SPRITES_CHAR = path.join(ASSETS_DIR, 'sprites', 'characters');
const UI_ICONS = path.join(ASSETS_DIR, 'ui', 'icons');
const VFX_DIR = path.join(ASSETS_DIR, 'vfx');
const BG_DIR = path.join(ASSETS_DIR, 'backgrounds');

// ============================================================
// 1. CLASS SELECTION SCREEN BACKGROUND (320×180)
// ============================================================
function generateBackground() {
  const W = 320, H = 180;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  // Deep dark base — dark stone hall feel
  rect(ctx, 0, 0, W, H, P.shadowBlack);

  // Subtle gradient bands (top to bottom, darker to slightly lighter)
  for (let y = 0; y < H; y++) {
    if (y < 20) {
      // Top — darkest
      hline(ctx, 0, y, W, P.shadowBlack);
    } else if (y < 40) {
      // Subtle transition
      if (y % 3 === 0) hline(ctx, 0, y, W, P.darkRock);
    } else if (y >= H - 20) {
      // Bottom floor area — slightly lighter
      if (y % 2 === 0) hline(ctx, 0, y, W, P.darkRock);
    }
  }

  // Stone floor tiles at bottom (subtle grid)
  for (let x = 0; x < W; x += 16) {
    for (let y = H - 16; y < H; y += 16) {
      // Tile border lines
      hline(ctx, x, y, 16, P.stoneGray);
      vline(ctx, x, y, 16, P.stoneGray);
      // Inner subtle shading
      if ((x / 16 + y / 16) % 2 === 0) {
        rect(ctx, x + 1, y + 1, 14, 14, P.darkRock);
      }
    }
  }

  // Decorative banner/header area at top
  rect(ctx, 0, 0, W, 2, P.darkGold);
  rect(ctx, 0, 2, W, 1, P.gold);
  // "CHOOSE YOUR CLASS" implied area — decorative border
  rect(ctx, 40, 6, 240, 14, P.deepOcean);
  borderedRect(ctx, 40, 6, 240, 14, P.oceanBlue, P.deepOcean);
  // Title bar inner highlight
  hline(ctx, 42, 7, 236, P.skyBlue);

  // Four pillar dividers (between class slots)
  const slotWidth = 72;
  const slotStartX = 8;
  for (let i = 0; i <= 4; i++) {
    const pillarX = slotStartX + i * (slotWidth + 4) - 2;
    if (i > 0 && i < 4) {
      // Inner pillar
      rect(ctx, pillarX, 22, 2, H - 42, P.stoneGray);
      rect(ctx, pillarX + 1, 22, 1, H - 42, P.midGray);
    }
  }

  // Subtle torch glow spots (decorative circles of warm light)
  const torchPositions = [20, 100, 220, 300];
  for (const tx of torchPositions) {
    // Small warm glow
    px(ctx, tx, 26, P.ember);
    px(ctx, tx - 1, 25, P.fireOrange);
    px(ctx, tx + 1, 25, P.fireOrange);
    px(ctx, tx, 24, P.brightYellow);
    // Glow spread (dithered)
    for (let dy = -2; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= 4 && Math.abs(dx) + Math.abs(dy) > 1) {
          if ((dx + dy) % 2 === 0) {
            px(ctx, tx + dx, 25 + dy, P.deepSoil);
          }
        }
      }
    }
  }

  // Bottom gold trim
  rect(ctx, 0, H - 2, W, 1, P.darkGold);
  rect(ctx, 0, H - 1, W, 1, P.gold);

  savePng(c, path.join(BG_DIR, 'bg_class_select.png'));
}

// ============================================================
// 2. CLASS SELECTION FRAME (unselected & selected)
// ============================================================
function generateFrames() {
  const W = 68, H = 130;

  // Unselected frame
  {
    const c = createCanvas(W, H);
    const ctx = c.getContext('2d');
    // Outer border
    borderedRect(ctx, 0, 0, W, H, P.stoneGray, null);
    // Inner fill — dark
    rect(ctx, 1, 1, W - 2, H - 2, P.deepOcean);
    // Inner border
    borderedRect(ctx, 2, 2, W - 4, H - 4, P.oceanBlue, null);
    // Character preview area (top half)
    rect(ctx, 4, 4, W - 8, 56, P.shadowBlack);
    borderedRect(ctx, 4, 4, W - 8, 56, P.darkRock, null);
    // Class name plate area
    rect(ctx, 4, 62, W - 8, 12, P.darkRock);
    borderedRect(ctx, 4, 62, W - 8, 12, P.stoneGray, P.darkRock);
    // Archetype icon slots (3 icons side by side)
    for (let i = 0; i < 3; i++) {
      const ix = 6 + i * 20;
      borderedRect(ctx, ix, 78, 18, 18, P.stoneGray, P.shadowBlack);
    }
    // Stat preview area (bottom)
    rect(ctx, 4, 100, W - 8, 26, P.shadowBlack);
    borderedRect(ctx, 4, 100, W - 8, 26, P.darkRock, P.shadowBlack);
    // Corner ornaments
    px(ctx, 0, 0, P.darkGold);
    px(ctx, W - 1, 0, P.darkGold);
    px(ctx, 0, H - 1, P.darkGold);
    px(ctx, W - 1, H - 1, P.darkGold);

    savePng(c, path.join(UI_SELECT, 'ui_class_frame.png'));
  }

  // Selected frame (highlighted)
  {
    const c = createCanvas(W, H);
    const ctx = c.getContext('2d');
    // Outer border — gold highlight
    borderedRect(ctx, 0, 0, W, H, P.gold, null);
    // Inner fill — slightly brighter
    rect(ctx, 1, 1, W - 2, H - 2, P.deepOcean);
    // Inner gold border
    borderedRect(ctx, 2, 2, W - 4, H - 4, P.darkGold, null);
    // Bright inner border
    borderedRect(ctx, 3, 3, W - 6, H - 6, P.oceanBlue, null);
    // Character preview area (top half) — slightly lighter
    rect(ctx, 4, 4, W - 8, 56, P.deepOcean);
    borderedRect(ctx, 4, 4, W - 8, 56, P.skyBlue, P.deepOcean);
    // Class name plate — highlighted
    rect(ctx, 4, 62, W - 8, 12, P.oceanBlue);
    borderedRect(ctx, 4, 62, W - 8, 12, P.gold, P.oceanBlue);
    // Archetype icon slots — gold bordered
    for (let i = 0; i < 3; i++) {
      const ix = 6 + i * 20;
      borderedRect(ctx, ix, 78, 18, 18, P.darkGold, P.shadowBlack);
    }
    // Stat preview area
    rect(ctx, 4, 100, W - 8, 26, P.shadowBlack);
    borderedRect(ctx, 4, 100, W - 8, 26, P.skyBlue, P.shadowBlack);
    // Gold corner ornaments
    for (const [ox, oy] of [[0,0],[1,0],[0,1],[W-1,0],[W-2,0],[W-1,1],[0,H-1],[1,H-1],[0,H-2],[W-1,H-1],[W-2,H-1],[W-1,H-2]]) {
      px(ctx, ox, oy, P.gold);
    }
    // Glow accent at top
    hline(ctx, 4, 3, W - 8, P.brightYellow);

    savePng(c, path.join(UI_SELECT, 'ui_class_frame_selected.png'));
  }
}

// ============================================================
// 3. FULL-BODY CHARACTER PREVIEW SPRITES (32×48 each)
//    Larger, more detailed versions for the selection screen
// ============================================================
function generateCharacterPreviews() {
  // Each preview is 32×48 — a detailed front-facing idle pose

  // --- WARRIOR (cyan/blue, heavy armor, sword+shield) ---
  function drawWarrior(ctx) {
    // Feet/boots — dark steel
    rect(ctx, 11, 43, 4, 4, P.stoneGray); // left boot
    rect(ctx, 17, 43, 4, 4, P.stoneGray); // right boot
    rect(ctx, 11, 44, 4, 3, P.midGray);
    rect(ctx, 17, 44, 4, 3, P.midGray);
    px(ctx, 12, 46, P.darkRock); // boot sole
    px(ctx, 18, 46, P.darkRock);

    // Legs — plate armor
    rect(ctx, 12, 36, 3, 7, P.playerBlue);
    rect(ctx, 17, 36, 3, 7, P.playerBlue);
    // Leg armor highlights
    vline(ctx, 13, 37, 5, P.iceBlue);
    vline(ctx, 18, 37, 5, P.iceBlue);
    // Knee guards
    rect(ctx, 11, 37, 5, 2, P.skyBlue);
    rect(ctx, 16, 37, 5, 2, P.skyBlue);

    // Torso — heavy plate
    rect(ctx, 11, 24, 10, 12, P.playerBlue);
    // Chest plate center
    rect(ctx, 13, 25, 6, 8, P.skyBlue);
    // Plate highlight
    rect(ctx, 14, 26, 4, 3, P.iceBlue);
    // Belt
    rect(ctx, 11, 34, 10, 2, P.darkGold);
    hline(ctx, 12, 34, 8, P.gold);
    // Belt buckle
    px(ctx, 15, 34, P.brightYellow);
    px(ctx, 16, 34, P.brightYellow);

    // Arms
    rect(ctx, 8, 25, 3, 10, P.playerBlue);  // left arm
    rect(ctx, 21, 25, 3, 10, P.playerBlue); // right arm
    // Shoulder pads
    rect(ctx, 7, 24, 5, 3, P.skyBlue);
    rect(ctx, 20, 24, 5, 3, P.skyBlue);
    px(ctx, 9, 24, P.iceBlue);
    px(ctx, 22, 24, P.iceBlue);
    // Gauntlets
    rect(ctx, 8, 34, 3, 2, P.stoneGray);
    rect(ctx, 21, 34, 3, 2, P.stoneGray);

    // Shield (left hand)
    rect(ctx, 4, 27, 5, 8, P.oceanBlue);
    borderedRect(ctx, 4, 27, 5, 8, P.skyBlue, P.oceanBlue);
    // Shield emblem
    px(ctx, 6, 30, P.gold);
    px(ctx, 6, 31, P.gold);

    // Sword (right hand)
    vline(ctx, 25, 18, 16, P.paleGray);  // blade
    vline(ctx, 26, 18, 16, P.lightStone); // blade edge
    px(ctx, 25, 17, P.nearWhite); // tip
    rect(ctx, 24, 33, 4, 1, P.darkGold); // crossguard
    rect(ctx, 25, 34, 2, 3, P.richEarth); // grip

    // Neck
    rect(ctx, 13, 22, 6, 3, P.sand);

    // Head (helmet)
    rect(ctx, 11, 12, 10, 10, P.playerBlue);
    // Helmet face opening
    rect(ctx, 13, 15, 6, 5, P.sand); // skin
    // Visor
    hline(ctx, 12, 14, 8, P.skyBlue);
    // Eyes
    px(ctx, 14, 17, P.shadowBlack);
    px(ctx, 17, 17, P.shadowBlack);
    // Helmet crest
    rect(ctx, 14, 10, 4, 3, P.skyBlue);
    rect(ctx, 15, 8, 2, 3, P.iceBlue);
    // Helmet highlight
    px(ctx, 12, 13, P.iceBlue);
  }

  // --- MAGE (purple robes, staff) ---
  function drawMage(ctx) {
    // Feet (showing under robe)
    rect(ctx, 12, 44, 3, 3, P.deepMagic);
    rect(ctx, 17, 44, 3, 3, P.deepMagic);
    px(ctx, 13, 46, P.magicPurple);
    px(ctx, 18, 46, P.magicPurple);

    // Robe (flowing, covers legs)
    // Wide at bottom
    rect(ctx, 9, 38, 14, 6, P.magicPurple);
    rect(ctx, 10, 32, 12, 6, P.magicPurple);
    rect(ctx, 11, 26, 10, 6, P.magicPurple);
    // Robe shading
    vline(ctx, 10, 34, 10, P.deepMagic);
    vline(ctx, 21, 34, 10, P.deepMagic);
    // Robe center fold
    vline(ctx, 15, 30, 14, P.manaViolet);
    vline(ctx, 16, 30, 14, P.manaViolet);
    // Robe hem highlight
    hline(ctx, 10, 43, 12, P.manaViolet);

    // Belt/sash
    rect(ctx, 11, 30, 10, 2, P.darkGold);
    hline(ctx, 12, 30, 8, P.gold);

    // Torso (upper robe)
    rect(ctx, 12, 24, 8, 6, P.magicPurple);
    // Robe collar
    rect(ctx, 13, 23, 6, 2, P.manaViolet);
    // Mystic symbol on chest
    px(ctx, 15, 26, P.spellGlow);
    px(ctx, 16, 26, P.spellGlow);
    px(ctx, 15, 27, P.manaViolet);
    px(ctx, 16, 27, P.manaViolet);

    // Arms (sleeves)
    rect(ctx, 9, 25, 3, 8, P.magicPurple);
    rect(ctx, 20, 25, 3, 8, P.magicPurple);
    // Sleeve trim
    hline(ctx, 9, 32, 3, P.manaViolet);
    hline(ctx, 20, 32, 3, P.manaViolet);
    // Hands
    rect(ctx, 9, 33, 3, 2, P.sand);
    rect(ctx, 20, 33, 3, 2, P.sand);

    // Staff (left hand)
    vline(ctx, 6, 10, 34, P.richEarth);
    vline(ctx, 7, 10, 34, P.dirt);
    // Staff orb
    rect(ctx, 4, 7, 5, 5, P.manaViolet);
    rect(ctx, 5, 8, 3, 3, P.spellGlow);
    px(ctx, 6, 9, P.nearWhite); // bright center
    // Orb glow
    px(ctx, 4, 6, P.spellGlow);
    px(ctx, 8, 6, P.spellGlow);
    px(ctx, 3, 9, P.manaViolet);
    px(ctx, 9, 9, P.manaViolet);

    // Neck
    rect(ctx, 14, 21, 4, 3, P.sand);

    // Head
    rect(ctx, 12, 12, 8, 9, P.sand);
    // Eyes
    px(ctx, 14, 16, P.shadowBlack);
    px(ctx, 17, 16, P.shadowBlack);
    // Mouth
    px(ctx, 15, 18, P.richEarth);
    // Wizard hat
    rect(ctx, 11, 9, 10, 4, P.magicPurple);
    rect(ctx, 12, 6, 8, 4, P.magicPurple);
    rect(ctx, 13, 4, 6, 3, P.magicPurple);
    rect(ctx, 14, 2, 4, 3, P.manaViolet);
    rect(ctx, 15, 1, 2, 2, P.manaViolet);
    // Hat brim
    hline(ctx, 10, 12, 12, P.manaViolet);
    // Hat band
    hline(ctx, 12, 9, 8, P.gold);
    // Hat star
    px(ctx, 15, 5, P.brightYellow);
  }

  // --- RANGER (green, bow, hood) ---
  function drawRanger(ctx) {
    // Boots — leather
    rect(ctx, 11, 43, 4, 4, P.richEarth);
    rect(ctx, 17, 43, 4, 4, P.richEarth);
    rect(ctx, 11, 45, 4, 2, P.deepSoil);
    rect(ctx, 17, 45, 4, 2, P.deepSoil);

    // Legs — leather pants
    rect(ctx, 12, 36, 3, 7, P.deepForest);
    rect(ctx, 17, 36, 3, 7, P.deepForest);
    vline(ctx, 13, 37, 5, P.forestGreen);
    vline(ctx, 18, 37, 5, P.forestGreen);

    // Torso — tunic
    rect(ctx, 11, 24, 10, 12, P.forestGreen);
    // Tunic detail
    rect(ctx, 13, 25, 6, 8, P.leafGreen);
    vline(ctx, 15, 26, 6, P.forestGreen); // center seam
    vline(ctx, 16, 26, 6, P.forestGreen);
    // Belt
    rect(ctx, 11, 34, 10, 2, P.richEarth);
    hline(ctx, 12, 34, 8, P.dirt);
    // Quiver strap
    vline(ctx, 19, 24, 10, P.richEarth);

    // Arms
    rect(ctx, 8, 25, 3, 9, P.forestGreen);
    rect(ctx, 21, 25, 3, 9, P.forestGreen);
    // Bracers
    rect(ctx, 8, 32, 3, 2, P.richEarth);
    rect(ctx, 21, 32, 3, 2, P.richEarth);
    // Hands
    rect(ctx, 8, 34, 3, 2, P.sand);
    rect(ctx, 21, 34, 3, 2, P.sand);

    // Bow (left hand)
    // Bow curve
    px(ctx, 5, 22, P.dirt);
    px(ctx, 4, 24, P.dirt);
    px(ctx, 3, 26, P.richEarth);
    px(ctx, 3, 28, P.richEarth);
    px(ctx, 3, 30, P.richEarth);
    px(ctx, 4, 32, P.dirt);
    px(ctx, 5, 34, P.dirt);
    // Bowstring
    vline(ctx, 6, 22, 13, P.paleGray);

    // Quiver (on back, visible right side)
    rect(ctx, 23, 18, 3, 14, P.richEarth);
    // Arrow feathers
    px(ctx, 23, 17, P.brightGrass);
    px(ctx, 24, 16, P.leafGreen);
    px(ctx, 25, 17, P.brightGrass);

    // Cloak/cape
    rect(ctx, 10, 24, 1, 16, P.deepForest);
    rect(ctx, 21, 24, 1, 16, P.deepForest);

    // Neck
    rect(ctx, 13, 21, 6, 3, P.sand);

    // Head with hood
    rect(ctx, 12, 12, 8, 9, P.sand);
    // Eyes
    px(ctx, 14, 16, P.shadowBlack);
    px(ctx, 17, 16, P.shadowBlack);
    // Mouth
    px(ctx, 15, 18, P.richEarth);
    // Hood
    rect(ctx, 10, 9, 12, 5, P.deepForest);
    rect(ctx, 11, 8, 10, 3, P.forestGreen);
    rect(ctx, 12, 7, 8, 2, P.forestGreen);
    // Hood shadow over face
    hline(ctx, 12, 13, 8, P.deepForest);
    // Hood inner
    rect(ctx, 12, 10, 8, 3, P.deepForest);
    // Hood highlight
    px(ctx, 15, 8, P.leafGreen);
    px(ctx, 16, 8, P.leafGreen);
  }

  // --- ARTISAN (brown/orange, hammer, apron) ---
  function drawArtisan(ctx) {
    // Boots — sturdy work boots
    rect(ctx, 11, 43, 4, 4, P.deepSoil);
    rect(ctx, 17, 43, 4, 4, P.deepSoil);
    rect(ctx, 11, 45, 4, 2, P.shadowBlack);
    rect(ctx, 17, 45, 4, 2, P.shadowBlack);

    // Legs — work pants
    rect(ctx, 12, 36, 3, 7, P.richEarth);
    rect(ctx, 17, 36, 3, 7, P.richEarth);
    vline(ctx, 13, 37, 5, P.dirt);
    vline(ctx, 18, 37, 5, P.dirt);

    // Torso — work shirt
    rect(ctx, 11, 24, 10, 12, P.dirt);
    rect(ctx, 13, 25, 6, 8, P.sand);
    // Apron over torso
    rect(ctx, 12, 26, 8, 14, P.richEarth);
    // Apron front
    rect(ctx, 13, 27, 6, 12, P.dirt);
    // Apron pocket
    borderedRect(ctx, 14, 32, 4, 3, P.deepSoil, P.richEarth);
    // Apron strap
    vline(ctx, 12, 24, 3, P.deepSoil);
    vline(ctx, 19, 24, 3, P.deepSoil);

    // Belt/tool belt
    rect(ctx, 11, 34, 10, 2, P.deepSoil);
    hline(ctx, 12, 34, 8, P.richEarth);
    // Tool pouch
    rect(ctx, 20, 33, 3, 3, P.deepSoil);

    // Arms — rolled-up sleeves
    rect(ctx, 8, 25, 3, 6, P.sand); // shirt
    rect(ctx, 21, 25, 3, 6, P.sand);
    rect(ctx, 8, 31, 3, 3, P.dirt); // forearm (skin tanned)
    rect(ctx, 21, 31, 3, 3, P.dirt);
    // Gloves
    rect(ctx, 8, 34, 3, 2, P.richEarth);
    rect(ctx, 21, 34, 3, 2, P.richEarth);

    // Hammer (right hand)
    vline(ctx, 25, 20, 14, P.richEarth); // handle
    rect(ctx, 24, 17, 4, 4, P.lightStone); // hammer head
    rect(ctx, 24, 17, 4, 1, P.paleGray); // head highlight
    px(ctx, 27, 18, P.midGray); // flat face
    px(ctx, 24, 18, P.midGray);

    // Small potion bottle (left hand)
    rect(ctx, 5, 31, 3, 4, P.leafGreen);
    rect(ctx, 5, 30, 3, 1, P.brightGrass);
    px(ctx, 6, 29, P.richEarth); // cork

    // Neck
    rect(ctx, 13, 21, 6, 3, P.sand);

    // Head — goggles on forehead
    rect(ctx, 12, 12, 8, 9, P.sand);
    // Eyes
    px(ctx, 14, 16, P.shadowBlack);
    px(ctx, 17, 16, P.shadowBlack);
    // Mouth (friendly smile)
    px(ctx, 15, 18, P.richEarth);
    px(ctx, 16, 18, P.richEarth);
    // Hair — messy
    rect(ctx, 11, 9, 10, 4, P.darkGold);
    rect(ctx, 12, 8, 8, 2, P.darkGold);
    px(ctx, 13, 7, P.darkGold);
    px(ctx, 18, 7, P.darkGold);
    // Goggles on forehead
    rect(ctx, 12, 11, 3, 2, P.stoneGray);
    rect(ctx, 17, 11, 3, 2, P.stoneGray);
    px(ctx, 13, 11, P.iceBlue); // lens
    px(ctx, 18, 11, P.iceBlue); // lens
    hline(ctx, 14, 11, 4, P.stoneGray); // bridge
  }

  const classes = [
    { name: 'warrior', draw: drawWarrior },
    { name: 'mage', draw: drawMage },
    { name: 'ranger', draw: drawRanger },
    { name: 'artisan', draw: drawArtisan },
  ];

  for (const cls of classes) {
    const c = createCanvas(32, 48);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    cls.draw(ctx);
    savePng(c, path.join(UI_SELECT, `char_preview_${cls.name}.png`));
  }
}

// ============================================================
// 4. ARCHETYPE PREVIEW ICONS (16×16 each)
// ============================================================
function generateArchetypeIcons() {
  const icons = [
    // WARRIOR archetypes
    {
      name: 'berserker',
      draw: (ctx) => {
        // Crossed axes icon
        // Axe 1 (diagonal top-left to bottom-right)
        px(ctx, 3, 3, P.lightStone); px(ctx, 4, 3, P.lightStone);
        px(ctx, 4, 4, P.lightStone); px(ctx, 5, 4, P.midGray);
        px(ctx, 5, 5, P.richEarth); px(ctx, 6, 6, P.richEarth);
        px(ctx, 7, 7, P.richEarth); px(ctx, 8, 8, P.richEarth);
        px(ctx, 9, 9, P.richEarth); px(ctx, 10, 10, P.richEarth);
        // Axe 2 (diagonal top-right to bottom-left)
        px(ctx, 12, 3, P.lightStone); px(ctx, 11, 3, P.lightStone);
        px(ctx, 11, 4, P.lightStone); px(ctx, 10, 4, P.midGray);
        px(ctx, 10, 5, P.richEarth); px(ctx, 9, 6, P.richEarth);
        px(ctx, 8, 7, P.richEarth); px(ctx, 7, 8, P.richEarth);
        px(ctx, 6, 9, P.richEarth); px(ctx, 5, 10, P.richEarth);
        // Rage aura
        px(ctx, 7, 2, P.brightRed); px(ctx, 8, 1, P.fireOrange);
        px(ctx, 7, 12, P.brightRed); px(ctx, 8, 13, P.fireOrange);
        // Red tint
        rect(ctx, 6, 5, 4, 4, P.brightRed);
        px(ctx, 7, 6, P.fireOrange);
        px(ctx, 8, 7, P.fireOrange);
      }
    },
    {
      name: 'guardian',
      draw: (ctx) => {
        // Shield icon
        rect(ctx, 4, 2, 8, 10, P.playerBlue);
        borderedRect(ctx, 4, 2, 8, 10, P.skyBlue, P.playerBlue);
        // Shield point at bottom
        px(ctx, 5, 12, P.playerBlue); rect(ctx, 6, 12, 4, 1, P.playerBlue);
        px(ctx, 10, 12, P.playerBlue);
        rect(ctx, 6, 13, 4, 1, P.skyBlue);
        px(ctx, 7, 14, P.playerBlue); px(ctx, 8, 14, P.playerBlue);
        // Shield cross
        vline(ctx, 7, 3, 8, P.gold);
        vline(ctx, 8, 3, 8, P.gold);
        hline(ctx, 5, 6, 6, P.gold);
        hline(ctx, 5, 7, 6, P.gold);
        // Center gem
        px(ctx, 7, 6, P.brightYellow);
        px(ctx, 8, 6, P.brightYellow);
        px(ctx, 7, 7, P.brightYellow);
        px(ctx, 8, 7, P.brightYellow);
      }
    },
    {
      name: 'paladin',
      draw: (ctx) => {
        // Holy cross with light rays
        vline(ctx, 7, 2, 12, P.gold);
        vline(ctx, 8, 2, 12, P.gold);
        hline(ctx, 4, 6, 8, P.gold);
        hline(ctx, 4, 7, 8, P.gold);
        // Cross highlight
        px(ctx, 7, 5, P.brightYellow);
        px(ctx, 8, 5, P.brightYellow);
        px(ctx, 7, 6, P.brightYellow);
        px(ctx, 8, 6, P.brightYellow);
        // Light rays
        px(ctx, 5, 3, P.paleHighlight);
        px(ctx, 10, 3, P.paleHighlight);
        px(ctx, 5, 10, P.paleHighlight);
        px(ctx, 10, 10, P.paleHighlight);
        px(ctx, 3, 5, P.paleHighlight);
        px(ctx, 12, 5, P.paleHighlight);
        px(ctx, 3, 8, P.paleHighlight);
        px(ctx, 12, 8, P.paleHighlight);
        // Wings
        px(ctx, 2, 4, P.nearWhite); px(ctx, 1, 5, P.shimmer);
        px(ctx, 13, 4, P.nearWhite); px(ctx, 14, 5, P.shimmer);
      }
    },
    // MAGE archetypes
    {
      name: 'pyromancer',
      draw: (ctx) => {
        // Fire icon
        px(ctx, 7, 2, P.brightYellow);
        px(ctx, 8, 2, P.brightYellow);
        rect(ctx, 6, 3, 4, 2, P.brightYellow);
        rect(ctx, 5, 5, 6, 3, P.fireOrange);
        rect(ctx, 5, 8, 6, 3, P.brightRed);
        rect(ctx, 6, 11, 4, 2, P.brightRed);
        // Fire inner
        px(ctx, 7, 4, P.nearWhite);
        px(ctx, 8, 5, P.brightYellow);
        px(ctx, 7, 6, P.brightYellow);
        // Ember particles
        px(ctx, 4, 4, P.ember); px(ctx, 11, 3, P.ember);
        px(ctx, 3, 7, P.fireOrange); px(ctx, 12, 6, P.fireOrange);
        // Fire base glow
        rect(ctx, 5, 13, 6, 1, P.deepBlood);
      }
    },
    {
      name: 'frostbinder',
      draw: (ctx) => {
        // Snowflake/ice crystal
        // Center
        px(ctx, 7, 7, P.nearWhite); px(ctx, 8, 7, P.nearWhite);
        px(ctx, 7, 8, P.nearWhite); px(ctx, 8, 8, P.nearWhite);
        // Vertical
        vline(ctx, 7, 2, 5, P.iceBlue); vline(ctx, 8, 2, 5, P.iceBlue);
        vline(ctx, 7, 9, 5, P.iceBlue); vline(ctx, 8, 9, 5, P.iceBlue);
        // Horizontal
        hline(ctx, 2, 7, 5, P.iceBlue); hline(ctx, 2, 8, 5, P.iceBlue);
        hline(ctx, 9, 7, 5, P.iceBlue); hline(ctx, 9, 8, 5, P.iceBlue);
        // Diagonal branches
        px(ctx, 4, 4, P.shimmer); px(ctx, 5, 5, P.shimmer);
        px(ctx, 11, 4, P.shimmer); px(ctx, 10, 5, P.shimmer);
        px(ctx, 4, 11, P.shimmer); px(ctx, 5, 10, P.shimmer);
        px(ctx, 11, 11, P.shimmer); px(ctx, 10, 10, P.shimmer);
        // Tips
        px(ctx, 3, 3, P.shimmer); px(ctx, 12, 3, P.shimmer);
        px(ctx, 3, 12, P.shimmer); px(ctx, 12, 12, P.shimmer);
      }
    },
    {
      name: 'arcanist',
      draw: (ctx) => {
        // Arcane rune circle
        // Outer ring
        hline(ctx, 5, 2, 6, P.manaViolet);
        hline(ctx, 5, 13, 6, P.manaViolet);
        vline(ctx, 2, 5, 6, P.manaViolet);
        vline(ctx, 13, 5, 6, P.manaViolet);
        px(ctx, 3, 3, P.manaViolet); px(ctx, 4, 3, P.manaViolet);
        px(ctx, 12, 3, P.manaViolet); px(ctx, 11, 3, P.manaViolet);
        px(ctx, 3, 12, P.manaViolet); px(ctx, 4, 12, P.manaViolet);
        px(ctx, 12, 12, P.manaViolet); px(ctx, 11, 12, P.manaViolet);
        // Inner star
        px(ctx, 7, 4, P.spellGlow); px(ctx, 8, 4, P.spellGlow);
        px(ctx, 5, 7, P.spellGlow); px(ctx, 10, 7, P.spellGlow);
        px(ctx, 5, 8, P.spellGlow); px(ctx, 10, 8, P.spellGlow);
        px(ctx, 7, 11, P.spellGlow); px(ctx, 8, 11, P.spellGlow);
        // Lines
        px(ctx, 6, 5, P.magicPurple); px(ctx, 9, 5, P.magicPurple);
        px(ctx, 6, 10, P.magicPurple); px(ctx, 9, 10, P.magicPurple);
        // Center
        px(ctx, 7, 7, P.nearWhite); px(ctx, 8, 7, P.nearWhite);
        px(ctx, 7, 8, P.nearWhite); px(ctx, 8, 8, P.nearWhite);
      }
    },
    // RANGER archetypes
    {
      name: 'sharpshooter',
      draw: (ctx) => {
        // Crosshair/target icon
        // Outer circle
        hline(ctx, 5, 2, 6, P.darkGold);
        hline(ctx, 5, 13, 6, P.darkGold);
        vline(ctx, 2, 5, 6, P.darkGold);
        vline(ctx, 13, 5, 6, P.darkGold);
        px(ctx, 3, 3, P.darkGold); px(ctx, 4, 3, P.darkGold);
        px(ctx, 12, 3, P.darkGold); px(ctx, 11, 3, P.darkGold);
        px(ctx, 3, 12, P.darkGold); px(ctx, 4, 12, P.darkGold);
        px(ctx, 12, 12, P.darkGold); px(ctx, 11, 12, P.darkGold);
        // Crosshair lines
        hline(ctx, 0, 7, 6, P.gold);
        hline(ctx, 10, 7, 6, P.gold);
        hline(ctx, 0, 8, 6, P.gold);
        hline(ctx, 10, 8, 6, P.gold);
        vline(ctx, 7, 0, 6, P.gold);
        vline(ctx, 8, 0, 6, P.gold);
        vline(ctx, 7, 10, 6, P.gold);
        vline(ctx, 8, 10, 6, P.gold);
        // Center dot
        px(ctx, 7, 7, P.brightYellow); px(ctx, 8, 7, P.brightYellow);
        px(ctx, 7, 8, P.brightYellow); px(ctx, 8, 8, P.brightYellow);
      }
    },
    {
      name: 'shadowstalker',
      draw: (ctx) => {
        // Dagger/shadow icon
        // Dagger blade
        px(ctx, 7, 1, P.nearWhite);
        px(ctx, 7, 2, P.paleGray); px(ctx, 8, 2, P.lightStone);
        px(ctx, 7, 3, P.paleGray); px(ctx, 8, 3, P.lightStone);
        px(ctx, 7, 4, P.paleGray); px(ctx, 8, 4, P.lightStone);
        px(ctx, 7, 5, P.lightStone); px(ctx, 8, 5, P.midGray);
        px(ctx, 7, 6, P.lightStone); px(ctx, 8, 6, P.midGray);
        // Crossguard
        hline(ctx, 5, 7, 6, P.magicPurple);
        // Grip
        px(ctx, 7, 8, P.deepMagic); px(ctx, 8, 8, P.deepMagic);
        px(ctx, 7, 9, P.magicPurple); px(ctx, 8, 9, P.magicPurple);
        px(ctx, 7, 10, P.deepMagic); px(ctx, 8, 10, P.deepMagic);
        // Pommel
        px(ctx, 7, 11, P.manaViolet); px(ctx, 8, 11, P.manaViolet);
        // Shadow wisps
        px(ctx, 4, 3, P.deepMagic); px(ctx, 3, 5, P.magicPurple);
        px(ctx, 11, 4, P.deepMagic); px(ctx, 12, 6, P.magicPurple);
        px(ctx, 5, 9, P.deepMagic); px(ctx, 10, 10, P.deepMagic);
        // Smoke/stealth particles
        px(ctx, 2, 8, P.stoneGray); px(ctx, 13, 7, P.stoneGray);
        px(ctx, 3, 11, P.midGray); px(ctx, 12, 10, P.midGray);
      }
    },
    {
      name: 'beastmaster',
      draw: (ctx) => {
        // Paw print icon
        // Main pad
        rect(ctx, 5, 8, 6, 4, P.forestGreen);
        rect(ctx, 6, 9, 4, 2, P.leafGreen);
        // Toe pads
        px(ctx, 4, 5, P.forestGreen); px(ctx, 5, 5, P.forestGreen);
        px(ctx, 4, 6, P.leafGreen);
        px(ctx, 7, 4, P.forestGreen); px(ctx, 8, 4, P.forestGreen);
        px(ctx, 7, 5, P.leafGreen);
        px(ctx, 10, 5, P.forestGreen); px(ctx, 11, 5, P.forestGreen);
        px(ctx, 11, 6, P.leafGreen);
        px(ctx, 6, 3, P.forestGreen);
        px(ctx, 9, 3, P.forestGreen);
        // Nature aura
        px(ctx, 2, 3, P.brightGrass); px(ctx, 13, 4, P.brightGrass);
        px(ctx, 3, 12, P.brightGrass); px(ctx, 12, 11, P.brightGrass);
        // Bottom nature line
        hline(ctx, 4, 13, 8, P.deepForest);
      }
    },
    // ARTISAN archetypes
    {
      name: 'blacksmith',
      draw: (ctx) => {
        // Anvil + hammer
        // Anvil body
        rect(ctx, 3, 9, 10, 3, P.stoneGray);
        rect(ctx, 4, 8, 8, 1, P.midGray);
        hline(ctx, 4, 8, 8, P.lightStone); // top surface highlight
        // Anvil horn
        px(ctx, 2, 9, P.midGray); px(ctx, 1, 9, P.stoneGray);
        // Anvil base
        rect(ctx, 5, 12, 6, 2, P.darkRock);
        // Hammer (above anvil)
        rect(ctx, 6, 2, 4, 3, P.lightStone); // head
        px(ctx, 7, 1, P.paleGray); px(ctx, 8, 1, P.paleGray);
        vline(ctx, 7, 5, 4, P.richEarth); // handle
        vline(ctx, 8, 5, 4, P.richEarth);
        // Sparks
        px(ctx, 4, 6, P.brightYellow); px(ctx, 11, 5, P.ember);
        px(ctx, 3, 4, P.fireOrange); px(ctx, 12, 7, P.brightYellow);
      }
    },
    {
      name: 'alchemist',
      draw: (ctx) => {
        // Potion flask with bubbles
        // Flask body
        rect(ctx, 5, 7, 6, 5, P.leafGreen);
        rect(ctx, 6, 6, 4, 1, P.leafGreen);
        // Flask neck
        rect(ctx, 7, 3, 2, 3, P.brightGrass);
        // Cork
        rect(ctx, 7, 2, 2, 1, P.richEarth);
        // Liquid highlight
        px(ctx, 6, 8, P.brightGrass);
        px(ctx, 7, 9, P.lightFoliage);
        // Flask outline
        px(ctx, 4, 8, P.forestGreen); px(ctx, 4, 9, P.forestGreen);
        px(ctx, 11, 8, P.forestGreen); px(ctx, 11, 9, P.forestGreen);
        // Bubbles
        px(ctx, 6, 7, P.lightFoliage);
        px(ctx, 8, 8, P.nearWhite);
        px(ctx, 9, 10, P.lightFoliage);
        // Steam/fumes
        px(ctx, 6, 1, P.brightGrass); px(ctx, 9, 0, P.lightFoliage);
        px(ctx, 8, 1, P.leafGreen);
        // Base
        hline(ctx, 5, 12, 6, P.forestGreen);
      }
    },
    {
      name: 'enchanter',
      draw: (ctx) => {
        // Rune circle with glowing symbol
        // Outer rune circle
        hline(ctx, 5, 1, 6, P.manaViolet);
        hline(ctx, 5, 14, 6, P.manaViolet);
        vline(ctx, 1, 5, 6, P.manaViolet);
        vline(ctx, 14, 5, 6, P.manaViolet);
        px(ctx, 3, 2, P.magicPurple); px(ctx, 2, 3, P.magicPurple);
        px(ctx, 12, 2, P.magicPurple); px(ctx, 13, 3, P.magicPurple);
        px(ctx, 3, 13, P.magicPurple); px(ctx, 2, 12, P.magicPurple);
        px(ctx, 12, 13, P.magicPurple); px(ctx, 13, 12, P.magicPurple);
        // Inner rune symbol (diamond)
        px(ctx, 7, 4, P.spellGlow); px(ctx, 8, 4, P.spellGlow);
        px(ctx, 5, 7, P.spellGlow); px(ctx, 10, 7, P.spellGlow);
        px(ctx, 5, 8, P.spellGlow); px(ctx, 10, 8, P.spellGlow);
        px(ctx, 7, 11, P.spellGlow); px(ctx, 8, 11, P.spellGlow);
        px(ctx, 6, 5, P.manaViolet); px(ctx, 9, 5, P.manaViolet);
        px(ctx, 6, 6, P.manaViolet); px(ctx, 9, 6, P.manaViolet);
        px(ctx, 6, 9, P.manaViolet); px(ctx, 9, 9, P.manaViolet);
        px(ctx, 6, 10, P.manaViolet); px(ctx, 9, 10, P.manaViolet);
        // Center glow
        rect(ctx, 7, 7, 2, 2, P.nearWhite);
        // Rune sparkles
        px(ctx, 4, 4, P.spellGlow); px(ctx, 11, 4, P.spellGlow);
        px(ctx, 4, 11, P.spellGlow); px(ctx, 11, 11, P.spellGlow);
      }
    },
  ];

  for (const icon of icons) {
    const c = createCanvas(16, 16);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    icon.draw(ctx);
    savePng(c, path.join(UI_SELECT, `icon_archetype_${icon.name}.png`));
  }
}

// ============================================================
// 5. CLASS DESCRIPTION PANEL & STAT UI ELEMENTS
// ============================================================
function generateUIElements() {
  // Class description panel background (120×80)
  {
    const W = 120, H = 80;
    const c = createCanvas(W, H);
    const ctx = c.getContext('2d');
    // Dark panel
    rect(ctx, 0, 0, W, H, P.deepOcean);
    // Border
    borderedRect(ctx, 0, 0, W, H, P.oceanBlue, null);
    borderedRect(ctx, 1, 1, W - 2, H - 2, P.stoneGray, null);
    // Inner area
    rect(ctx, 2, 2, W - 4, H - 4, P.deepOcean);
    // Title bar
    rect(ctx, 2, 2, W - 4, 10, P.oceanBlue);
    hline(ctx, 3, 2, W - 6, P.skyBlue);
    // Divider line under title
    hline(ctx, 3, 12, W - 6, P.stoneGray);
    // Corner accents
    px(ctx, 0, 0, P.gold); px(ctx, W - 1, 0, P.gold);
    px(ctx, 0, H - 1, P.gold); px(ctx, W - 1, H - 1, P.gold);

    savePng(c, path.join(UI_SELECT, 'ui_class_desc_panel.png'));
  }

  // Stat bar frame (40×6) — one per stat
  {
    const W = 40, H = 6;
    const c = createCanvas(W, H);
    const ctx = c.getContext('2d');
    borderedRect(ctx, 0, 0, W, H, P.stoneGray, P.shadowBlack);
    // Inner track
    rect(ctx, 1, 1, W - 2, H - 2, P.darkRock);
    savePng(c, path.join(UI_SELECT, 'ui_stat_bar_frame.png'));
  }

  // Stat bar fill segments (1×4 each color for different stats)
  const statColors = {
    'strength': P.brightRed,      // STR
    'magic': P.manaViolet,        // MAG
    'defense': P.playerBlue,      // DEF
    'speed': P.brightGrass,       // SPD
    'crafting': P.darkGold,       // CRF
  };
  for (const [stat, color] of Object.entries(statColors)) {
    const c = createCanvas(1, 4);
    const ctx = c.getContext('2d');
    rect(ctx, 0, 0, 1, 4, color);
    savePng(c, path.join(UI_SELECT, `ui_stat_fill_${stat}.png`));
  }

  // Stat icon labels (8×8 tiny icons for STR/MAG/DEF/SPD/CRF)
  const statIcons = [
    { name: 'strength', draw: (ctx) => {
      // Sword
      vline(ctx, 3, 0, 6, P.paleGray);
      vline(ctx, 4, 0, 6, P.lightStone);
      hline(ctx, 1, 5, 6, P.stoneGray); // crossguard
      rect(ctx, 3, 6, 2, 2, P.richEarth); // grip
    }},
    { name: 'magic', draw: (ctx) => {
      // Star
      px(ctx, 3, 0, P.manaViolet); px(ctx, 4, 0, P.manaViolet);
      px(ctx, 2, 1, P.spellGlow); rect(ctx, 3, 1, 2, 2, P.spellGlow); px(ctx, 5, 1, P.spellGlow);
      hline(ctx, 0, 3, 8, P.manaViolet);
      px(ctx, 2, 4, P.spellGlow); px(ctx, 5, 4, P.spellGlow);
      rect(ctx, 3, 4, 2, 1, P.spellGlow);
      px(ctx, 1, 5, P.manaViolet); px(ctx, 6, 5, P.manaViolet);
      px(ctx, 2, 6, P.manaViolet); px(ctx, 5, 6, P.manaViolet);
    }},
    { name: 'defense', draw: (ctx) => {
      // Mini shield
      rect(ctx, 1, 0, 6, 5, P.playerBlue);
      rect(ctx, 2, 5, 4, 1, P.skyBlue);
      px(ctx, 3, 6, P.playerBlue); px(ctx, 4, 6, P.playerBlue);
      // cross
      vline(ctx, 3, 1, 4, P.gold); vline(ctx, 4, 1, 4, P.gold);
      hline(ctx, 2, 2, 4, P.gold);
    }},
    { name: 'speed', draw: (ctx) => {
      // Lightning bolt
      px(ctx, 5, 0, P.brightYellow); px(ctx, 4, 1, P.brightYellow);
      px(ctx, 3, 2, P.brightYellow); rect(ctx, 2, 3, 4, 1, P.gold);
      px(ctx, 4, 4, P.brightYellow); px(ctx, 3, 5, P.brightYellow);
      px(ctx, 2, 6, P.brightYellow); px(ctx, 1, 7, P.gold);
    }},
    { name: 'crafting', draw: (ctx) => {
      // Hammer
      rect(ctx, 2, 0, 4, 2, P.lightStone);
      vline(ctx, 3, 2, 5, P.richEarth); vline(ctx, 4, 2, 5, P.richEarth);
      // Anvil below
      hline(ctx, 1, 7, 6, P.stoneGray);
    }},
  ];
  for (const icon of statIcons) {
    const c = createCanvas(8, 8);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    icon.draw(ctx);
    savePng(c, path.join(UI_SELECT, `icon_stat_${icon.name}.png`));
  }
}

// ============================================================
// 6. SELECTION HIGHLIGHT & CONFIRMATION VFX
// ============================================================
function generateVFX() {
  // Selection highlight — 6 frame spritesheet (animated glow border)
  // Each frame is 72×134 (slightly bigger than the 68×130 frame)
  {
    const FW = 72, FH = 134, frames = 6;
    const c = createCanvas(FW * frames, FH);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const glowColors = [P.darkGold, P.gold, P.brightYellow, P.gold, P.darkGold, P.gold];
    const glowWidths = [1, 1, 2, 2, 1, 1];

    for (let f = 0; f < frames; f++) {
      const ox = f * FW;
      const gc = glowColors[f];
      const gw = glowWidths[f];

      // Glow border (pulsing)
      for (let g = 0; g < gw; g++) {
        // Top
        hline(ctx, ox + 2 + g, g, FW - 4 - g * 2, gc);
        // Bottom
        hline(ctx, ox + 2 + g, FH - 1 - g, FW - 4 - g * 2, gc);
        // Left
        vline(ctx, ox + g, 2 + g, FH - 4 - g * 2, gc);
        // Right
        vline(ctx, ox + FW - 1 - g, 2 + g, FH - 4 - g * 2, gc);
      }

      // Corner sparkles (rotating through frames)
      const sparklePositions = [
        [2, 2], [FW - 3, 2], [2, FH - 3], [FW - 3, FH - 3]
      ];
      for (let s = 0; s < sparklePositions.length; s++) {
        const [sx, sy] = sparklePositions[s];
        const bright = (f + s) % 3 === 0;
        px(ctx, ox + sx, sy, bright ? P.brightYellow : P.darkGold);
      }
    }

    savePng(c, path.join(VFX_DIR, 'vfx_select_highlight.png'));
  }

  // Confirmation effect — 8 frame burst spritesheet
  // Each frame is 48×48 (centered burst)
  {
    const FW = 48, FH = 48, frames = 8;
    const c = createCanvas(FW * frames, FH);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    for (let f = 0; f < frames; f++) {
      const ox = f * FW;
      const cx = 24, cy = 24;
      const progress = f / (frames - 1); // 0 to 1

      if (f < 2) {
        // Initial flash — bright center
        const r = 2 + f * 3;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            if (dx * dx + dy * dy <= r * r) {
              const dist = Math.sqrt(dx * dx + dy * dy);
              let color;
              if (dist < r * 0.3) color = P.nearWhite;
              else if (dist < r * 0.6) color = P.brightYellow;
              else color = P.gold;
              px(ctx, ox + cx + dx, cy + dy, color);
            }
          }
        }
      } else if (f < 6) {
        // Expanding ring
        const r = 4 + (f - 2) * 5;
        const thickness = 2;
        for (let dy = -r - thickness; dy <= r + thickness; dy++) {
          for (let dx = -r - thickness; dx <= r + thickness; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist >= r - thickness && dist <= r + thickness) {
              const px2 = ox + cx + dx;
              const py2 = cy + dy;
              if (px2 >= ox && px2 < ox + FW && py2 >= 0 && py2 < FH) {
                if (dist < r) px(ctx, px2, py2, P.gold);
                else if (dist < r + 1) px(ctx, px2, py2, P.brightYellow);
                else px(ctx, px2, py2, P.darkGold);
              }
            }
          }
        }
        // Center sparkle fading
        if (f < 4) {
          px(ctx, ox + cx, cy, P.nearWhite);
          px(ctx, ox + cx - 1, cy, P.brightYellow);
          px(ctx, ox + cx + 1, cy, P.brightYellow);
          px(ctx, ox + cx, cy - 1, P.brightYellow);
          px(ctx, ox + cx, cy + 1, P.brightYellow);
        }
      } else {
        // Fading particles
        const numParticles = 12 - (f - 6) * 4;
        for (let p = 0; p < numParticles; p++) {
          const angle = (p / numParticles) * Math.PI * 2;
          const dist = 16 + (f - 6) * 4;
          const ppx = Math.round(cx + Math.cos(angle) * dist);
          const ppy = Math.round(cy + Math.sin(angle) * dist);
          if (ppx >= 0 && ppx < FW && ppy >= 0 && ppy < FH) {
            px(ctx, ox + ppx, ppy, f === 6 ? P.gold : P.darkGold);
          }
        }
      }
    }

    savePng(c, path.join(VFX_DIR, 'vfx_select_confirm.png'));
  }
}

// ============================================================
// 7. PORTRAIT ICONS for all 4 classes (for the existing panel layout)
// ============================================================
function generatePortraits() {
  // 24×24 portrait icons (face only) for Warrior, Mage, Ranger
  // Artisan already exists (ui_portrait_artisan.png)
  const portraits = [
    { name: 'warrior', draw: (ctx) => {
      // Face
      rect(ctx, 7, 10, 10, 10, P.sand);
      // Eyes
      px(ctx, 9, 14, P.shadowBlack); px(ctx, 14, 14, P.shadowBlack);
      // Helmet
      rect(ctx, 6, 5, 12, 7, P.playerBlue);
      rect(ctx, 8, 4, 8, 2, P.skyBlue);
      // Visor
      hline(ctx, 7, 11, 10, P.skyBlue);
      // Crest
      rect(ctx, 10, 2, 4, 3, P.iceBlue);
      // Chin guard
      rect(ctx, 8, 19, 8, 2, P.playerBlue);
    }},
    { name: 'mage', draw: (ctx) => {
      // Face
      rect(ctx, 7, 10, 10, 10, P.sand);
      // Eyes
      px(ctx, 9, 14, P.shadowBlack); px(ctx, 14, 14, P.shadowBlack);
      // Hat
      rect(ctx, 5, 6, 14, 5, P.magicPurple);
      rect(ctx, 7, 3, 10, 4, P.magicPurple);
      rect(ctx, 9, 1, 6, 3, P.manaViolet);
      // Hat band
      hline(ctx, 6, 10, 12, P.gold);
      // Beard stub
      rect(ctx, 9, 18, 6, 2, P.paleGray);
    }},
    { name: 'ranger', draw: (ctx) => {
      // Face
      rect(ctx, 7, 10, 10, 10, P.sand);
      // Eyes
      px(ctx, 9, 14, P.shadowBlack); px(ctx, 14, 14, P.shadowBlack);
      // Hood
      rect(ctx, 5, 4, 14, 8, P.deepForest);
      rect(ctx, 6, 3, 12, 3, P.forestGreen);
      rect(ctx, 8, 2, 8, 2, P.forestGreen);
      // Hood shadow
      hline(ctx, 7, 11, 10, P.deepForest);
      // Mask/scarf
      rect(ctx, 8, 17, 8, 3, P.forestGreen);
    }},
  ];

  for (const p of portraits) {
    const c = createCanvas(24, 24);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    p.draw(ctx);
    savePng(c, path.join(UI_SELECT, `ui_portrait_${p.name}.png`));
  }
}

// ============================================================
// MAIN
// ============================================================
console.log('PIX-290: Generating class selection art assets...\n');

generateBackground();
generateFrames();
generateCharacterPreviews();
generateArchetypeIcons();
generateUIElements();
generateVFX();
generatePortraits();

console.log('\nDone! All class selection art assets generated.');
