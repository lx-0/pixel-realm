#!/usr/bin/env node
/**
 * Generate mounted player riding animation sprites for all 4 classes.
 * Output: char_player_{class}_mounted.png
 * Format: 320x64 sprite sheet (10 cols × 2 rows of 32x32 frames)
 *   Row 1: 8-frame ride cycle right + 2 idle frames
 *   Row 2: 8-frame ride cycle left (mirrored) + 2 idle frames
 * Style: 16×24 character pixel art within 32×32 frame (allows mount space)
 */

const { execSync } = require('child_process');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'sprites', 'characters');

// Frame dimensions
const FRAME_W = 32;
const FRAME_H = 32;
const COLS = 10;
const ROWS = 2;
const SHEET_W = FRAME_W * COLS; // 320
const SHEET_H = FRAME_H * ROWS; // 64

// Bounce offsets for ride cycle (8 frames of up/down bob)
const BOUNCE = [0, -1, -2, -1, 0, 1, 2, 1];

// Class definitions with color palettes and visual features
const CLASSES = {
  warrior: {
    // Blue-steel armor, broad shoulders, sword pommel visible on back
    helmet: '#4a6fa5',
    helmetHighlight: '#6b8fc5',
    armor: '#3a5a8a',
    armorHighlight: '#5a7aaa',
    skin: '#e8c49a',
    skinShadow: '#c4a070',
    accent: '#c0c0d0', // silver trim
    cape: '#2a4a7a',
    capeShadow: '#1a3a6a',
    weapon: '#a0a0b0', // sword hilt on back
    weaponAccent: '#707080',
  },
  mage: {
    // Purple robes, pointed hat, staff glow
    helmet: '#7b4fa0', // pointed hat
    helmetHighlight: '#9b6fc0',
    armor: '#6a3f90', // robes
    armorHighlight: '#8a5fb0',
    skin: '#f0d0a0',
    skinShadow: '#d0b080',
    accent: '#ffd700', // gold trim
    cape: '#5a2f80',
    capeShadow: '#4a1f70',
    weapon: '#90d0ff', // staff with glow
    weaponAccent: '#60a0d0',
  },
  ranger: {
    // Green hood, leather armor, bow visible
    helmet: '#4a7a3a', // green hood
    helmetHighlight: '#6a9a5a',
    armor: '#6a5a3a', // brown leather
    armorHighlight: '#8a7a5a',
    skin: '#e0b888',
    skinShadow: '#c09868',
    accent: '#8aaa5a', // green accent
    cape: '#3a6a2a', // green cloak
    capeShadow: '#2a5a1a',
    weapon: '#8a6a3a', // bow wood
    weaponAccent: '#6a4a2a',
  },
  artisan: {
    // Brown apron, work hat, hammer/tool
    helmet: '#8a6a4a', // work cap
    helmetHighlight: '#aa8a6a',
    armor: '#7a5a3a', // work apron/vest
    armorHighlight: '#9a7a5a',
    skin: '#f0d4a8',
    skinShadow: '#d0b488',
    accent: '#c08030', // copper/bronze details
    cape: '#6a4a2a',
    capeShadow: '#5a3a1a',
    weapon: '#a09090', // hammer head
    weaponAccent: '#706060',
  },
};

/**
 * Draw a single mounted rider frame using ImageMagick draw commands.
 * Returns array of draw commands for the pixels.
 * The rider sits in the upper portion of the 32x32 frame (mount below).
 * offsetX/offsetY: frame position on the sheet
 * bounceY: vertical bounce offset for ride cycle
 * mirror: if true, flip horizontally
 */
function drawRider(colors, offsetX, offsetY, bounceY, mirror, frameVariant) {
  const cmds = [];
  const px = (x, y, color) => {
    const fx = mirror ? (offsetX + FRAME_W - 1 - x) : (offsetX + x);
    const fy = offsetY + y + bounceY;
    cmds.push(`fill '${color}' point ${fx},${fy}`);
  };

  // Character is drawn in upper-center of 32x32 frame
  // Base position: centered at x=12..19 (8px wide), y=2..18 (16px tall riding pose)
  const bx = 12; // base x offset within frame
  const by = 2;  // base y offset within frame

  // --- HEAD / HELMET (varies by class) ---
  // Hat/helmet top
  px(bx + 2, by, colors.helmet);
  px(bx + 3, by, colors.helmet);
  px(bx + 4, by, colors.helmet);
  px(bx + 5, by, colors.helmet);

  // Hat/helmet middle
  px(bx + 1, by + 1, colors.helmet);
  px(bx + 2, by + 1, colors.helmetHighlight);
  px(bx + 3, by + 1, colors.helmetHighlight);
  px(bx + 4, by + 1, colors.helmet);
  px(bx + 5, by + 1, colors.helmet);
  px(bx + 6, by + 1, colors.helmet);

  // Face
  px(bx + 1, by + 2, colors.helmet);
  px(bx + 2, by + 2, colors.skin);
  px(bx + 3, by + 2, colors.skin);
  px(bx + 4, by + 2, colors.skinShadow);
  px(bx + 5, by + 2, colors.skin);
  px(bx + 6, by + 2, colors.helmet);

  // Face bottom / chin
  px(bx + 2, by + 3, colors.skinShadow);
  px(bx + 3, by + 3, colors.skin);
  px(bx + 4, by + 3, colors.skin);
  px(bx + 5, by + 3, colors.skinShadow);

  // --- TORSO / ARMOR ---
  // Shoulders
  px(bx + 0, by + 4, colors.armor);
  px(bx + 1, by + 4, colors.armorHighlight);
  px(bx + 2, by + 4, colors.armorHighlight);
  px(bx + 3, by + 4, colors.accent);
  px(bx + 4, by + 4, colors.accent);
  px(bx + 5, by + 4, colors.armorHighlight);
  px(bx + 6, by + 4, colors.armorHighlight);
  px(bx + 7, by + 4, colors.armor);

  // Upper body
  px(bx + 0, by + 5, colors.cape);
  px(bx + 1, by + 5, colors.armor);
  px(bx + 2, by + 5, colors.armorHighlight);
  px(bx + 3, by + 5, colors.armor);
  px(bx + 4, by + 5, colors.armor);
  px(bx + 5, by + 5, colors.armorHighlight);
  px(bx + 6, by + 5, colors.armor);
  px(bx + 7, by + 5, colors.cape);

  // Mid body
  px(bx + 0, by + 6, colors.capeShadow);
  px(bx + 1, by + 6, colors.armor);
  px(bx + 2, by + 6, colors.armor);
  px(bx + 3, by + 6, colors.armorHighlight);
  px(bx + 4, by + 6, colors.armorHighlight);
  px(bx + 5, by + 6, colors.armor);
  px(bx + 6, by + 6, colors.armor);
  px(bx + 7, by + 6, colors.capeShadow);

  // Waist / belt area
  px(bx + 1, by + 7, colors.accent);
  px(bx + 2, by + 7, colors.accent);
  px(bx + 3, by + 7, colors.armor);
  px(bx + 4, by + 7, colors.armor);
  px(bx + 5, by + 7, colors.accent);
  px(bx + 6, by + 7, colors.accent);

  // --- ARMS (holding reins) ---
  // Arm positions vary slightly per frame for riding motion
  const armOffset = frameVariant % 2 === 0 ? 0 : 1;
  // Left arm (rein)
  px(bx + 0, by + 5 + armOffset, colors.skin);
  px(bx + 0, by + 6 + armOffset, colors.skinShadow);
  // Right arm (rein)
  px(bx + 7, by + 5 + armOffset, colors.skin);
  px(bx + 7, by + 6 + armOffset, colors.skinShadow);

  // --- LEGS (riding pose, straddling mount) ---
  // Left leg
  px(bx + 1, by + 8, colors.armor);
  px(bx + 2, by + 8, colors.armor);
  px(bx + 0, by + 9, colors.armorHighlight);
  px(bx + 1, by + 9, colors.armor);

  // Right leg
  px(bx + 5, by + 8, colors.armor);
  px(bx + 6, by + 8, colors.armor);
  px(bx + 6, by + 9, colors.armor);
  px(bx + 7, by + 9, colors.armorHighlight);

  // Boots
  px(bx + 0, by + 10, colors.armorHighlight);
  px(bx + 7, by + 10, colors.armorHighlight);

  // --- WEAPON on back (class-specific detail) ---
  // Sword/staff/bow/hammer visible behind character
  px(bx + 7, by + 2, colors.weapon);
  px(bx + 7, by + 3, colors.weapon);
  px(bx + 7, by + 1, colors.weaponAccent);

  // --- REINS (thin line from hands to front) ---
  px(bx + 0, by + 7, colors.accent);
  px(bx - 1, by + 8, colors.accent);

  return cmds;
}

// Generate sprite sheet for each class
for (const [className, colors] of Object.entries(CLASSES)) {
  const outputFile = path.join(OUTPUT_DIR, `char_player_${className}_mounted.png`);

  let drawCommands = [];

  // Row 1: 8-frame ride cycle facing right + 2 idle frames
  for (let i = 0; i < 8; i++) {
    const frameX = i * FRAME_W;
    const frameY = 0;
    const bounce = BOUNCE[i];
    const cmds = drawRider(colors, frameX, frameY, bounce, false, i);
    drawCommands.push(...cmds);
  }
  // 2 idle frames (no bounce)
  for (let i = 8; i < 10; i++) {
    const frameX = i * FRAME_W;
    const frameY = 0;
    const cmds = drawRider(colors, frameX, frameY, 0, false, i);
    drawCommands.push(...cmds);
  }

  // Row 2: 8-frame ride cycle facing left (mirrored) + 2 idle frames
  for (let i = 0; i < 8; i++) {
    const frameX = i * FRAME_W;
    const frameY = FRAME_H;
    const bounce = BOUNCE[i];
    const cmds = drawRider(colors, frameX, frameY, bounce, true, i);
    drawCommands.push(...cmds);
  }
  // 2 idle frames (mirrored, no bounce)
  for (let i = 8; i < 10; i++) {
    const frameX = i * FRAME_W;
    const frameY = FRAME_H;
    const cmds = drawRider(colors, frameX, frameY, 0, true, i);
    drawCommands.push(...cmds);
  }

  // Build ImageMagick command
  const drawStr = drawCommands.map(c => `-draw "${c}"`).join(' ');
  const cmd = `convert -size ${SHEET_W}x${SHEET_H} xc:transparent ${drawStr} '${outputFile}'`;

  try {
    execSync(cmd, { maxBuffer: 1024 * 1024 * 10 });
    console.log(`✓ Generated ${path.basename(outputFile)} (${SHEET_W}x${SHEET_H})`);
  } catch (err) {
    console.error(`✗ Failed to generate ${className}: ${err.message}`);
    // Try with a temp file for draw commands if command too long
    const fs = require('fs');
    const tmpFile = `/tmp/draw_${className}.mvg`;
    const mvgContent = drawCommands.map(c => c).join('\n');
    fs.writeFileSync(tmpFile, mvgContent);
    try {
      execSync(`convert -size ${SHEET_W}x${SHEET_H} xc:transparent -draw "@${tmpFile}" '${outputFile}'`);
      console.log(`✓ Generated ${path.basename(outputFile)} via MVG (${SHEET_W}x${SHEET_H})`);
    } catch (err2) {
      console.error(`✗ MVG fallback also failed: ${err2.message}`);
    }
  }
}

console.log('\nDone! Mounted riding sprites generated.');
