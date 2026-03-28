/**
 * Combat Sprite Generator
 * Generates dodge/roll, sprint, invincibility VFX, stamina bar UI, and sprint trail particles
 * for PixelRealm combat system (PIX-365).
 *
 * Convention: 32x32 base sprites, 4-directional (down, left, right, up), 6 frames per direction.
 * Sprite sheets: 6 columns x 4 rows = 192x128 px
 */
const { createCanvas } = require('/tmp/sprite-gen/node_modules/canvas');
const fs = require('fs');
const path = require('path');

const COMBAT_DIR = path.join(__dirname, '..', 'public', 'assets', 'combat');
const TILE = 32;
const COLS = 6; // frames per direction
const ROWS = 4; // directions: down, left, right, up

// Class color palettes (matching existing asset style)
const CLASS_PALETTES = {
  warrior: {
    body: '#2a7ab5',     // blue armor
    accent: '#e6b422',   // gold trim
    dark: '#1a4a6e',     // shadow
    skin: '#e8c49a',     // skin
    outline: '#0d2b3e',  // outline
  },
  mage: {
    body: '#7b2d8e',     // purple robe
    accent: '#c4a6f0',   // light purple
    dark: '#4a1a55',     // shadow
    skin: '#e8c49a',
    outline: '#2a0d33',
  },
  ranger: {
    body: '#2d8e3b',     // green leather
    accent: '#8bc34a',   // light green
    dark: '#1a5524',     // shadow
    skin: '#e8c49a',
    outline: '#0d330f',
  },
  rogue: {
    body: '#8e2d2d',     // dark red
    accent: '#d4544a',   // red accent
    dark: '#551a1a',     // shadow
    skin: '#e8c49a',
    outline: '#330d0d',
  },
};

function setPixel(ctx, x, y, color, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

// Draw a basic character body for a given direction and frame offset
function drawCharBase(ctx, ox, oy, palette, dir) {
  // Head
  drawPixelRect(ctx, ox + 12, oy + 4, 8, 8, palette.skin);
  drawPixelRect(ctx, ox + 11, oy + 3, 10, 1, palette.outline);
  drawPixelRect(ctx, ox + 11, oy + 12, 10, 1, palette.outline);
  setPixel(ctx, ox + 11, oy + 4, palette.outline);
  setPixel(ctx, ox + 20, oy + 4, palette.outline);

  // Eyes based on direction
  if (dir === 0) { // down
    setPixel(ctx, ox + 14, oy + 8, palette.outline, 2);
    setPixel(ctx, ox + 17, oy + 8, palette.outline, 2);
  } else if (dir === 3) { // up
    // no eyes visible from behind
    drawPixelRect(ctx, ox + 12, oy + 4, 8, 8, palette.dark);
  } else if (dir === 1) { // left
    setPixel(ctx, ox + 13, oy + 8, palette.outline, 2);
  } else { // right
    setPixel(ctx, ox + 18, oy + 8, palette.outline, 2);
  }

  // Body armor
  drawPixelRect(ctx, ox + 10, oy + 13, 12, 8, palette.body);
  drawPixelRect(ctx, ox + 13, oy + 13, 6, 2, palette.accent);

  // Legs
  drawPixelRect(ctx, ox + 11, oy + 21, 4, 6, palette.dark);
  drawPixelRect(ctx, ox + 17, oy + 21, 4, 6, palette.dark);

  // Feet
  drawPixelRect(ctx, ox + 10, oy + 27, 5, 2, palette.body);
  drawPixelRect(ctx, ox + 17, oy + 27, 5, 2, palette.body);
}

/**
 * DODGE/ROLL sprites
 * 6 frames: stand -> crouch -> tuck -> roll1 -> roll2 -> recover
 */
function drawDodgeFrame(ctx, ox, oy, palette, dir, frame) {
  const cx = ox; // cell origin
  const cy = oy;

  switch (frame) {
    case 0: // stand/ready
      drawCharBase(ctx, cx, cy, palette, dir);
      break;
    case 1: // crouch - lower body
      // Head lower
      drawPixelRect(ctx, cx + 12, cy + 8, 8, 7, palette.skin);
      if (dir === 0) {
        setPixel(ctx, cx + 14, cy + 12, palette.outline, 2);
        setPixel(ctx, cx + 17, cy + 12, palette.outline, 2);
      }
      // Body
      drawPixelRect(ctx, cx + 9, cy + 15, 14, 6, palette.body);
      drawPixelRect(ctx, cx + 12, cy + 15, 8, 2, palette.accent);
      // Crouched legs
      drawPixelRect(ctx, cx + 9, cy + 21, 6, 4, palette.dark);
      drawPixelRect(ctx, cx + 17, cy + 21, 6, 4, palette.dark);
      drawPixelRect(ctx, cx + 8, cy + 25, 7, 3, palette.body);
      drawPixelRect(ctx, cx + 17, cy + 25, 7, 3, palette.body);
      break;
    case 2: // tuck - ball shape
      // Compact ball
      drawPixelRect(ctx, cx + 10, cy + 12, 12, 10, palette.body);
      drawPixelRect(ctx, cx + 12, cy + 10, 8, 3, palette.skin);
      drawPixelRect(ctx, cx + 11, cy + 14, 10, 3, palette.accent);
      drawPixelRect(ctx, cx + 10, cy + 22, 12, 4, palette.dark);
      // Outline
      drawPixelRect(ctx, cx + 10, cy + 11, 12, 1, palette.outline);
      drawPixelRect(ctx, cx + 10, cy + 26, 12, 1, palette.outline);
      break;
    case 3: // roll 1 - rotated ball moving
    {
      const rollOff = dir === 1 ? -3 : dir === 2 ? 3 : 0;
      const rollOffY = dir === 0 ? 3 : dir === 3 ? -3 : 0;
      drawPixelRect(ctx, cx + 10 + rollOff, cy + 12 + rollOffY, 12, 10, palette.body);
      drawPixelRect(ctx, cx + 11 + rollOff, cy + 14 + rollOffY, 10, 3, palette.accent);
      drawPixelRect(ctx, cx + 12 + rollOff, cy + 18 + rollOffY, 8, 3, palette.skin);
      drawPixelRect(ctx, cx + 10 + rollOff, cy + 11 + rollOffY, 12, 1, palette.outline);
      // Motion blur pixels
      if (dir === 1) {
        setPixel(ctx, cx + 23, cy + 16, palette.body);
        setPixel(ctx, cx + 24, cy + 17, palette.dark);
      } else if (dir === 2) {
        setPixel(ctx, cx + 8, cy + 16, palette.body);
        setPixel(ctx, cx + 7, cy + 17, palette.dark);
      }
      break;
    }
    case 4: // roll 2 - further displaced
    {
      const rollOff2 = dir === 1 ? -5 : dir === 2 ? 5 : 0;
      const rollOffY2 = dir === 0 ? 5 : dir === 3 ? -5 : 0;
      drawPixelRect(ctx, cx + 10 + rollOff2, cy + 12 + rollOffY2, 12, 10, palette.body);
      drawPixelRect(ctx, cx + 12 + rollOff2, cy + 10 + rollOffY2, 8, 3, palette.skin);
      drawPixelRect(ctx, cx + 11 + rollOff2, cy + 14 + rollOffY2, 10, 3, palette.accent);
      drawPixelRect(ctx, cx + 10 + rollOff2, cy + 22 + rollOffY2, 12, 4, palette.dark);
      // Trail
      const trailColor = palette.body + '80';
      ctx.globalAlpha = 0.4;
      drawPixelRect(ctx, cx + 12, cy + 14, 8, 6, palette.body);
      ctx.globalAlpha = 1.0;
      break;
    }
    case 5: // recover - standing back up
      // Similar to crouch but rising
      drawPixelRect(ctx, cx + 12, cy + 6, 8, 7, palette.skin);
      if (dir === 0) {
        setPixel(ctx, cx + 14, cy + 10, palette.outline, 2);
        setPixel(ctx, cx + 17, cy + 10, palette.outline, 2);
      }
      drawPixelRect(ctx, cx + 10, cy + 13, 12, 7, palette.body);
      drawPixelRect(ctx, cx + 13, cy + 13, 6, 2, palette.accent);
      drawPixelRect(ctx, cx + 11, cy + 20, 4, 5, palette.dark);
      drawPixelRect(ctx, cx + 17, cy + 20, 4, 5, palette.dark);
      drawPixelRect(ctx, cx + 10, cy + 25, 5, 3, palette.body);
      drawPixelRect(ctx, cx + 17, cy + 25, 5, 3, palette.body);
      break;
  }
}

/**
 * SPRINT sprites
 * 6 frames: run cycle with exaggerated stride and arm pump
 */
function drawSprintFrame(ctx, ox, oy, palette, dir, frame) {
  const cx = ox;
  const cy = oy;
  const legPhase = frame % 3; // 3-phase leg cycle
  const armSwing = Math.sin((frame / 6) * Math.PI * 2) * 3;
  const bounce = frame % 2 === 0 ? 0 : -1; // vertical bounce

  // Head with bounce
  drawPixelRect(ctx, cx + 12, cy + 3 + bounce, 8, 7, palette.skin);
  if (dir === 0) {
    setPixel(ctx, cx + 14, cy + 7 + bounce, palette.outline, 2);
    setPixel(ctx, cx + 17, cy + 7 + bounce, palette.outline, 2);
  } else if (dir === 3) {
    drawPixelRect(ctx, cx + 12, cy + 3 + bounce, 8, 7, palette.dark);
  } else if (dir === 1) {
    setPixel(ctx, cx + 13, cy + 7 + bounce, palette.outline, 2);
  } else {
    setPixel(ctx, cx + 18, cy + 7 + bounce, palette.outline, 2);
  }

  // Body leaning forward
  const lean = (dir === 1) ? -1 : (dir === 2) ? 1 : (dir === 0) ? 0 : 0;
  drawPixelRect(ctx, cx + 10 + lean, cy + 10 + bounce, 12, 8, palette.body);
  drawPixelRect(ctx, cx + 13 + lean, cy + 10 + bounce, 6, 2, palette.accent);

  // Arms pumping
  if (dir === 0 || dir === 3) {
    // Side arms
    const armOff1 = legPhase === 0 ? -2 : legPhase === 1 ? 0 : 2;
    const armOff2 = -armOff1;
    drawPixelRect(ctx, cx + 7, cy + 11 + bounce + armOff1, 3, 5, palette.skin);
    drawPixelRect(ctx, cx + 22, cy + 11 + bounce + armOff2, 3, 5, palette.skin);
  } else if (dir === 1) {
    const armFwd = legPhase === 0 ? -3 : legPhase === 1 ? 0 : 2;
    drawPixelRect(ctx, cx + 8 + armFwd, cy + 11 + bounce, 3, 5, palette.skin);
  } else {
    const armFwd = legPhase === 0 ? 3 : legPhase === 1 ? 0 : -2;
    drawPixelRect(ctx, cx + 21 + armFwd, cy + 11 + bounce, 3, 5, palette.skin);
  }

  // Legs in wide stride
  const legSpread = legPhase === 0 ? 3 : legPhase === 1 ? 0 : -3;
  if (dir === 0 || dir === 3) {
    drawPixelRect(ctx, cx + 10 + legSpread, cy + 18 + bounce, 4, 7, palette.dark);
    drawPixelRect(ctx, cx + 18 - legSpread, cy + 18 + bounce, 4, 7, palette.dark);
    drawPixelRect(ctx, cx + 9 + legSpread, cy + 25 + bounce, 5, 3, palette.body);
    drawPixelRect(ctx, cx + 18 - legSpread, cy + 25 + bounce, 5, 3, palette.body);
  } else if (dir === 1) {
    drawPixelRect(ctx, cx + 12 + legSpread, cy + 18 + bounce, 4, 7, palette.dark);
    drawPixelRect(ctx, cx + 14 - legSpread, cy + 18 + bounce, 4, 7, palette.dark);
    drawPixelRect(ctx, cx + 11 + legSpread, cy + 25 + bounce, 5, 3, palette.body);
  } else {
    drawPixelRect(ctx, cx + 14 + legSpread, cy + 18 + bounce, 4, 7, palette.dark);
    drawPixelRect(ctx, cx + 16 - legSpread, cy + 18 + bounce, 4, 7, palette.dark);
    drawPixelRect(ctx, cx + 15 - legSpread, cy + 25 + bounce, 5, 3, palette.body);
  }

  // Speed lines behind character
  ctx.globalAlpha = 0.3;
  if (dir === 2 && frame % 2 === 0) {
    drawPixelRect(ctx, cx + 2, cy + 14 + bounce, 6, 1, palette.accent);
    drawPixelRect(ctx, cx + 4, cy + 17 + bounce, 4, 1, palette.accent);
  } else if (dir === 1 && frame % 2 === 0) {
    drawPixelRect(ctx, cx + 24, cy + 14 + bounce, 6, 1, palette.accent);
    drawPixelRect(ctx, cx + 24, cy + 17 + bounce, 4, 1, palette.accent);
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Generate a sprite sheet (6 cols x 4 rows of 32x32 tiles)
 */
function generateSpriteSheet(filename, drawFrameFn, palette) {
  const width = COLS * TILE;
  const height = ROWS * TILE;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, width, height);

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const ox = col * TILE;
      const oy = row * TILE;
      drawFrameFn(ctx, ox, oy, palette, row, col);
    }
  }

  const buf = canvas.toBuffer('image/png');
  const filePath = path.join(COMBAT_DIR, filename);
  fs.writeFileSync(filePath, buf);
  console.log(`  Created: ${filePath}`);
}

/**
 * INVINCIBILITY VFX - ghost/flash overlay
 * 4 frames, each 32x32
 */
function generateInvincibilityVFX() {
  const frames = 6;
  const canvas = createCanvas(frames * TILE, TILE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let f = 0; f < frames; f++) {
    const ox = f * TILE;
    const alpha = [0.8, 0.5, 0.3, 0.15, 0.3, 0.6][f];

    // Ghost silhouette with varying opacity
    ctx.globalAlpha = alpha;

    // White flash body shape
    drawPixelRect(ctx, ox + 12, 4, 8, 8, '#ffffff');
    drawPixelRect(ctx, ox + 10, 12, 12, 9, '#ffffff');
    drawPixelRect(ctx, ox + 11, 21, 4, 6, '#ffffff');
    drawPixelRect(ctx, ox + 17, 21, 4, 6, '#ffffff');

    // Blue tint edge
    ctx.globalAlpha = alpha * 0.6;
    drawPixelRect(ctx, ox + 9, 4, 1, 23, '#88ccff');
    drawPixelRect(ctx, ox + 22, 4, 1, 23, '#88ccff');
    drawPixelRect(ctx, ox + 10, 3, 12, 1, '#88ccff');
    drawPixelRect(ctx, ox + 10, 27, 12, 1, '#88ccff');

    // Sparkle pixels
    ctx.globalAlpha = alpha;
    const sparklePositions = [
      [ox + 8, 2], [ox + 24, 6], [ox + 6, 15], [ox + 25, 20],
      [ox + 10, 28], [ox + 22, 28]
    ];
    sparklePositions.forEach(([sx, sy], i) => {
      if ((f + i) % 3 === 0) {
        setPixel(ctx, sx, sy, '#ffffff', 2);
      }
    });
  }

  ctx.globalAlpha = 1.0;
  const buf = canvas.toBuffer('image/png');
  const filePath = path.join(COMBAT_DIR, 'vfx_invincibility_flash.png');
  fs.writeFileSync(filePath, buf);
  console.log(`  Created: ${filePath}`);
}

/**
 * STAMINA BAR UI elements
 * Contains: bar frame, fill (full/mid/low), and empty states
 */
function generateStaminaBarUI() {
  // Stamina bar frame: 64x12
  const barWidth = 64;
  const barHeight = 12;
  const canvas = createCanvas(barWidth * 4, barHeight); // 4 states side by side
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const states = [
    { fill: 1.0, color: '#44cc44', label: 'full' },
    { fill: 0.6, color: '#cccc44', label: 'mid' },
    { fill: 0.25, color: '#cc4444', label: 'low' },
    { fill: 0.0, color: '#333333', label: 'empty' },
  ];

  states.forEach((state, i) => {
    const ox = i * barWidth;

    // Outer frame
    drawPixelRect(ctx, ox + 1, 0, barWidth - 2, 1, '#555555');
    drawPixelRect(ctx, ox + 1, barHeight - 1, barWidth - 2, 1, '#555555');
    drawPixelRect(ctx, ox, 1, 1, barHeight - 2, '#555555');
    drawPixelRect(ctx, ox + barWidth - 1, 1, 1, barHeight - 2, '#555555');

    // Inner frame
    drawPixelRect(ctx, ox + 2, 1, barWidth - 4, 1, '#333333');
    drawPixelRect(ctx, ox + 2, barHeight - 2, barWidth - 4, 1, '#333333');
    drawPixelRect(ctx, ox + 1, 2, 1, barHeight - 4, '#333333');
    drawPixelRect(ctx, ox + barWidth - 2, 2, 1, barHeight - 4, '#333333');

    // Background
    drawPixelRect(ctx, ox + 2, 2, barWidth - 4, barHeight - 4, '#1a1a2e');

    // Fill
    const fillWidth = Math.floor((barWidth - 4) * state.fill);
    if (fillWidth > 0) {
      drawPixelRect(ctx, ox + 2, 2, fillWidth, barHeight - 4, state.color);
      // Highlight on top
      ctx.globalAlpha = 0.4;
      drawPixelRect(ctx, ox + 2, 2, fillWidth, 2, '#ffffff');
      ctx.globalAlpha = 1.0;
      // Dark bottom
      ctx.globalAlpha = 0.3;
      drawPixelRect(ctx, ox + 2, barHeight - 4, fillWidth, 2, '#000000');
      ctx.globalAlpha = 1.0;
    }
  });

  const buf = canvas.toBuffer('image/png');
  const filePath = path.join(COMBAT_DIR, 'ui_stamina_bar.png');
  fs.writeFileSync(filePath, buf);
  console.log(`  Created: ${filePath}`);

  // Stamina bar icon (lightning bolt) 16x16
  const iconCanvas = createCanvas(16, 16);
  const iconCtx = iconCanvas.getContext('2d');
  iconCtx.clearRect(0, 0, 16, 16);

  // Lightning bolt shape
  const boltColor = '#ffdd44';
  const boltDark = '#cc9900';
  drawPixelRect(iconCtx, 7, 1, 4, 2, boltColor);
  drawPixelRect(iconCtx, 6, 3, 4, 2, boltColor);
  drawPixelRect(iconCtx, 4, 5, 6, 2, boltColor);
  drawPixelRect(iconCtx, 6, 7, 4, 2, boltColor);
  drawPixelRect(iconCtx, 7, 9, 3, 2, boltColor);
  drawPixelRect(iconCtx, 8, 11, 2, 2, boltColor);
  drawPixelRect(iconCtx, 9, 13, 2, 2, boltColor);
  // Shading
  drawPixelRect(iconCtx, 8, 2, 3, 1, boltDark);
  drawPixelRect(iconCtx, 7, 6, 3, 1, boltDark);

  const iconBuf = iconCanvas.toBuffer('image/png');
  const iconPath = path.join(COMBAT_DIR, 'ui_stamina_icon.png');
  fs.writeFileSync(iconPath, iconBuf);
  console.log(`  Created: ${iconPath}`);
}

/**
 * SPRINT TRAIL PARTICLES
 * 8 frames of dust/speed particles
 */
function generateSprintTrail() {
  const frames = 8;
  const canvas = createCanvas(frames * TILE, TILE);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let f = 0; f < frames; f++) {
    const ox = f * TILE;
    const progress = f / (frames - 1);

    // Dust particles expanding and fading
    ctx.globalAlpha = 1.0 - progress * 0.8;

    const numParticles = 6;
    for (let p = 0; p < numParticles; p++) {
      // Deterministic "random" positions based on frame and particle index
      const angle = (p / numParticles) * Math.PI * 2 + f * 0.3;
      const radius = 3 + progress * 10;
      const px = 16 + Math.cos(angle) * radius;
      const py = 20 + Math.sin(angle) * radius * 0.6; // flatten vertically
      const size = Math.max(1, 3 - Math.floor(progress * 3));

      // Dust colors
      const colors = ['#c4a672', '#a08050', '#d4b682', '#8a6840'];
      const color = colors[p % colors.length];

      drawPixelRect(ctx, Math.floor(px), Math.floor(py), size, size, color);
    }

    // Speed lines
    if (f < 4) {
      ctx.globalAlpha = 0.5 - progress * 0.4;
      drawPixelRect(ctx, ox + 2, 14, 8 - f * 2, 1, '#d4b682');
      drawPixelRect(ctx, ox + 4, 18, 6 - f, 1, '#c4a672');
      drawPixelRect(ctx, ox + 3, 22, 7 - f * 2, 1, '#a08050');
    }
  }

  ctx.globalAlpha = 1.0;
  const buf = canvas.toBuffer('image/png');
  const filePath = path.join(COMBAT_DIR, 'vfx_sprint_trail.png');
  fs.writeFileSync(filePath, buf);
  console.log(`  Created: ${filePath}`);

  // Additional sprint wind effect
  const windCanvas = createCanvas(frames * TILE, TILE);
  const windCtx = windCanvas.getContext('2d');
  windCtx.clearRect(0, 0, windCanvas.width, windCanvas.height);

  for (let f = 0; f < frames; f++) {
    const ox = f * TILE;
    const progress = f / (frames - 1);
    windCtx.globalAlpha = 0.6 - progress * 0.5;

    // Horizontal speed lines
    for (let l = 0; l < 4; l++) {
      const ly = 8 + l * 6;
      const lw = 12 - f * 1.5 + l * 2;
      if (lw > 0) {
        drawPixelRect(windCtx, ox + 3 + l * 2, ly, Math.floor(lw), 1, '#aaddff');
      }
    }
  }

  windCtx.globalAlpha = 1.0;
  const windBuf = windCanvas.toBuffer('image/png');
  const windPath = path.join(COMBAT_DIR, 'vfx_sprint_wind.png');
  fs.writeFileSync(windPath, windBuf);
  console.log(`  Created: ${windPath}`);
}

// ===== MAIN =====
console.log('Generating combat sprites for PIX-365...\n');

// 1. Dodge/Roll sprites for each class
console.log('--- Dodge/Roll Sprite Sheets ---');
for (const [className, palette] of Object.entries(CLASS_PALETTES)) {
  generateSpriteSheet(
    `char_player_${className}_dodge_roll.png`,
    drawDodgeFrame,
    palette
  );
}

// 2. Sprint sprites for each class
console.log('\n--- Sprint Sprite Sheets ---');
for (const [className, palette] of Object.entries(CLASS_PALETTES)) {
  generateSpriteSheet(
    `char_player_${className}_sprint_combat.png`,
    drawSprintFrame,
    palette
  );
}

// 3. Invincibility VFX
console.log('\n--- Invincibility VFX ---');
generateInvincibilityVFX();

// 4. Stamina Bar UI
console.log('\n--- Stamina Bar UI ---');
generateStaminaBarUI();

// 5. Sprint Trail Particles
console.log('\n--- Sprint Trail Particles ---');
generateSprintTrail();

console.log('\nDone! All combat sprites generated.');
