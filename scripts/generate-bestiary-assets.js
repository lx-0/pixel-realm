/**
 * Bestiary & Monster Compendium Art Asset Generator
 * Generates pixel art assets for the bestiary/compendium system (PIX-367)
 * Uses pngjs (pure JS) for PNG generation.
 */

const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'assets', 'bestiary');

// === PIXEL BUFFER HELPERS ===

function createImage(w, h) {
  const png = new PNG({ width: w, height: h, filterType: -1 });
  // Fill transparent
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = png.data[i+1] = png.data[i+2] = 0;
    png.data[i+3] = 255;
  }
  return png;
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const [r, g, b] = hexToRgb(color);
  const idx = (png.width * y + x) << 2;
  png.data[idx] = r; png.data[idx+1] = g; png.data[idx+2] = b; png.data[idx+3] = 255;
}

function getPixel(png, x, y) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return [0,0,0,0];
  const idx = (png.width * y + x) << 2;
  return [png.data[idx], png.data[idx+1], png.data[idx+2], png.data[idx+3]];
}

function fillRect(png, x, y, w, h, color) {
  const [r, g, b] = hexToRgb(color);
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue;
      const idx = (png.width * py + px) << 2;
      png.data[idx] = r; png.data[idx+1] = g; png.data[idx+2] = b; png.data[idx+3] = 255;
    }
  }
}

function drawBorder(png, x, y, w, h, color, t) {
  fillRect(png, x, y, w, t, color);
  fillRect(png, x, y + h - t, w, t, color);
  fillRect(png, x, y, t, h, color);
  fillRect(png, x + w - t, y, t, h, color);
}

function fillCircle(png, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx*dx + dy*dy <= r*r) setPixel(png, cx+dx, cy+dy, color);
    }
  }
}

function fillDiamond(png, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= r) setPixel(png, cx+dx, cy+dy, color);
    }
  }
}

// Scaled drawing: logical pixel -> physical pixels
function sp(png, lx, ly, color, s) {
  fillRect(png, lx * s, ly * s, s, s, color);
}
function sr(png, lx, ly, lw, lh, color, s) {
  fillRect(png, lx * s, ly * s, lw * s, lh * s, color);
}
function sb(png, lx, ly, lw, lh, color, t, s) {
  drawBorder(png, lx*s, ly*s, lw*s, lh*s, color, t*s);
}
function sc(png, cx, cy, r, color, s) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx*dx + dy*dy <= r*r) {
        fillRect(png, (cx+dx)*s, (cy+dy)*s, s, s, color);
      }
    }
  }
}

function savePng(png, filename) {
  const buf = PNG.sync.write(png);
  fs.writeFileSync(path.join(OUT, filename), buf);
  console.log(`  -> ${filename}`);
}

// === COLOR PALETTES ===
const P = {
  uiDark: '#1a1a2e', uiBg: '#16213e', uiMid: '#2a2a4a',
  uiBorder: '#c4841d', uiBorderLight: '#e8a33c', uiBorderDark: '#8b5e14',
  uiAccent: '#e8a33c', uiRivet: '#d4942a',
  pageParchment: '#e8d5a8', pageDark: '#c4a870', pageLines: '#b89860', pageShadow: '#a08050',
  ink: '#2a1a0a',
  forest: { primary: '#2d5a1e', secondary: '#4a8a2e', accent: '#8bc34a', bg: '#1a3a12' },
  ice: { primary: '#4a7a9a', secondary: '#8abada', accent: '#c0e8ff', bg: '#2a4a6a' },
  desert: { primary: '#c4941a', secondary: '#e8b84a', accent: '#f0d878', bg: '#8a6a1a' },
  volcanic: { primary: '#8a2a1a', secondary: '#c44a2a', accent: '#ff6a3a', bg: '#4a1a0a' },
  dungeon: { primary: '#4a3a5a', secondary: '#6a5a7a', accent: '#9a8aaa', bg: '#2a1a3a' },
  ocean: { primary: '#1a4a7a', secondary: '#2a6a9a', accent: '#4a9aca', bg: '#0a2a4a' },
};

// === ENEMY DATA ===
const ENEMIES = [
  { id: 'slime', biome: 'forest', color: '#4aaa2a', hi: '#6cd44a', dk: '#2a7a1a', shape: 'blob' },
  { id: 'goblin', biome: 'forest', color: '#aa3a2a', hi: '#cc5a4a', dk: '#6a1a0a', shape: 'hum_s' },
  { id: 'orc', biome: 'forest', color: '#8a4a2a', hi: '#aa6a4a', dk: '#5a2a0a', shape: 'hum_l' },
  { id: 'skeleton', biome: 'dungeon', color: '#d0c8b8', hi: '#e8e0d0', dk: '#908880', shape: 'hum' },
  { id: 'frost_wolf', biome: 'ice', color: '#8abada', hi: '#aadaff', dk: '#4a6a8a', shape: 'quad' },
  { id: 'fire_imp', biome: 'volcanic', color: '#e84a2a', hi: '#ff7a5a', dk: '#a02a0a', shape: 'hum_s' },
  { id: 'crystal_golem', biome: 'dungeon', color: '#4aaaba', hi: '#6adada', dk: '#2a7a8a', shape: 'hum_l' },
  { id: 'desert_wraith', biome: 'desert', color: '#d4b87a', hi: '#ead8a0', dk: '#9a8850', shape: 'ghost' },
  { id: 'lava_slime', biome: 'volcanic', color: '#e8a020', hi: '#ffc040', dk: '#a06010', shape: 'blob' },
  { id: 'sand_scorpion', biome: 'desert', color: '#a07830', hi: '#c09848', dk: '#6a4818', shape: 'insect' },
  { id: 'ice_elemental', biome: 'ice', color: '#6ac0e0', hi: '#8ae0ff', dk: '#3a80a0', shape: 'elem' },
  { id: 'magma_golem', biome: 'volcanic', color: '#c04020', hi: '#e06040', dk: '#802010', shape: 'hum_l' },
  { id: 'sandstone_golem', biome: 'desert', color: '#b89868', hi: '#d8b888', dk: '#887848', shape: 'hum_l' },
  { id: 'dun_golem', biome: 'dungeon', color: '#6a5a7a', hi: '#8a7a9a', dk: '#3a2a4a', shape: 'hum_l' },
  { id: 'dun_mage', biome: 'dungeon', color: '#7a3a8a', hi: '#9a5aaa', dk: '#4a1a5a', shape: 'hum' },
  { id: 'dun_skeleton', biome: 'dungeon', color: '#b8b0a0', hi: '#d0c8b8', dk: '#787068', shape: 'hum' },
  { id: 'dun_spider', biome: 'dungeon', color: '#3a3a3a', hi: '#5a5a5a', dk: '#1a1a1a', shape: 'insect' },
  { id: 'boss_dungeon', biome: 'dungeon', color: '#6a2a8a', hi: '#9a5aba', dk: '#3a0a5a', shape: 'hum_l', boss: true },
  { id: 'boss_glacial_wyrm', biome: 'ice', color: '#5a9aca', hi: '#8acafa', dk: '#2a5a8a', shape: 'serpent', boss: true },
  { id: 'boss_pharaoh_shade', biome: 'desert', color: '#c4a41a', hi: '#e8c84a', dk: '#8a6a0a', shape: 'ghost', boss: true },
  { id: 'boss_infernal_warden', biome: 'volcanic', color: '#ca3a1a', hi: '#fa6a4a', dk: '#7a1a0a', shape: 'hum_l', boss: true },
];

function drawMonsterPortrait(e) {
  const size = 128, s = 4; // 32 logical px * 4 = 128
  const png = createImage(size, size);
  const biome = P[e.biome];

  // Background
  sr(png, 0, 0, 32, 32, biome.bg, s);
  sr(png, 4, 4, 24, 24, biome.primary, s);
  sr(png, 6, 6, 20, 20, biome.bg, s);

  const cx = 16, cy = 16;
  switch (e.shape) {
    case 'blob':
      sc(png, cx, cy+2, 7, e.dk, s);
      sc(png, cx, cy+1, 6, e.color, s);
      sc(png, cx-1, cy-1, 4, e.hi, s);
      sr(png, cx-3, cy-2, 2, 2, '#ffffff', s);
      sr(png, cx+1, cy-2, 2, 2, '#ffffff', s);
      sp(png, cx-2, cy-1, '#111111', s);
      sp(png, cx+2, cy-1, '#111111', s);
      sr(png, cx-2, cy+2, 4, 1, e.dk, s);
      break;
    case 'hum_s':
      sr(png, cx-3, cy-1, 6, 7, e.color, s);
      sr(png, cx-2, cy, 4, 5, e.hi, s);
      sc(png, cx, cy-4, 4, e.color, s);
      sc(png, cx, cy-5, 3, e.hi, s);
      sr(png, cx-2, cy-6, 2, 2, '#ffff00', s);
      sr(png, cx+1, cy-6, 2, 2, '#ffff00', s);
      sp(png, cx-1, cy-5, '#aa0000', s);
      sp(png, cx+2, cy-5, '#aa0000', s);
      sp(png, cx-4, cy-7, e.color, s);
      sp(png, cx+4, cy-7, e.color, s);
      sr(png, cx-5, cy, 2, 4, e.color, s);
      sr(png, cx+4, cy, 2, 4, e.color, s);
      sr(png, cx-2, cy+6, 2, 3, e.dk, s);
      sr(png, cx+1, cy+6, 2, 3, e.dk, s);
      break;
    case 'hum':
      sr(png, cx-3, cy-2, 6, 8, e.color, s);
      sr(png, cx-2, cy-1, 4, 6, e.hi, s);
      sc(png, cx, cy-6, 4, e.color, s);
      sr(png, cx-3, cy-8, 6, 3, e.hi, s);
      sr(png, cx-2, cy-7, 2, 1, '#222222', s);
      sr(png, cx+1, cy-7, 2, 1, '#222222', s);
      sr(png, cx-5, cy-1, 2, 5, e.color, s);
      sr(png, cx+4, cy-1, 2, 5, e.color, s);
      sr(png, cx-2, cy+6, 2, 4, e.dk, s);
      sr(png, cx+1, cy+6, 2, 4, e.dk, s);
      break;
    case 'hum_l':
      sr(png, cx-5, cy-3, 10, 10, e.dk, s);
      sr(png, cx-4, cy-2, 8, 8, e.color, s);
      sr(png, cx-3, cy-1, 6, 6, e.hi, s);
      sc(png, cx, cy-7, 5, e.color, s);
      sc(png, cx, cy-7, 4, e.hi, s);
      if (e.boss) {
        sr(png, cx-3, cy-9, 2, 2, '#ff0000', s);
        sr(png, cx+2, cy-9, 2, 2, '#ff0000', s);
        sp(png, cx-4, cy-12, e.hi, s);
        sp(png, cx, cy-13, e.hi, s);
        sp(png, cx+4, cy-12, e.hi, s);
      } else {
        sr(png, cx-3, cy-9, 2, 2, '#ffff00', s);
        sr(png, cx+2, cy-9, 2, 2, '#ffff00', s);
      }
      sp(png, cx-2, cy-8, '#111111', s);
      sp(png, cx+3, cy-8, '#111111', s);
      sr(png, cx-7, cy-2, 2, 7, e.color, s);
      sr(png, cx+6, cy-2, 2, 7, e.color, s);
      sr(png, cx-8, cy+4, 3, 3, e.dk, s);
      sr(png, cx+6, cy+4, 3, 3, e.dk, s);
      sr(png, cx-3, cy+7, 3, 4, e.dk, s);
      sr(png, cx+1, cy+7, 3, 4, e.dk, s);
      break;
    case 'quad':
      sr(png, cx-6, cy-1, 12, 5, e.color, s);
      sr(png, cx-5, cy, 10, 3, e.hi, s);
      sr(png, cx+4, cy-5, 6, 5, e.color, s);
      sr(png, cx+5, cy-4, 4, 3, e.hi, s);
      sp(png, cx+5, cy-6, e.color, s);
      sp(png, cx+8, cy-6, e.color, s);
      sp(png, cx+8, cy-4, '#ff0000', s);
      sr(png, cx+9, cy-3, 2, 2, e.dk, s);
      sp(png, cx+10, cy-2, '#111111', s);
      sr(png, cx-8, cy-3, 3, 2, e.color, s);
      sp(png, cx-9, cy-4, e.hi, s);
      sr(png, cx-5, cy+4, 2, 4, e.dk, s);
      sr(png, cx-2, cy+4, 2, 4, e.dk, s);
      sr(png, cx+2, cy+4, 2, 4, e.dk, s);
      sr(png, cx+5, cy+4, 2, 4, e.dk, s);
      break;
    case 'ghost':
      for (let x = -6; x <= 6; x++) {
        const wave = Math.sin(x * 0.8) * 2;
        const h = 8 + Math.floor(wave);
        sr(png, cx+x, cy-4, 1, h, e.color, s);
      }
      for (let x = -4; x <= 4; x++) sr(png, cx+x, cy-3, 1, 5, e.hi, s);
      sc(png, cx, cy-6, 5, e.color, s);
      sc(png, cx, cy-6, 4, e.hi, s);
      if (e.boss) {
        sr(png, cx-3, cy-8, 2, 2, '#f0c000', s);
        sr(png, cx+2, cy-8, 2, 2, '#f0c000', s);
        sr(png, cx-4, cy-11, 8, 1, '#f0c000', s);
        sp(png, cx-3, cy-12, '#f0c000', s);
        sp(png, cx, cy-12, '#f0c000', s);
        sp(png, cx+3, cy-12, '#f0c000', s);
      } else {
        sr(png, cx-3, cy-8, 2, 2, '#ffffff', s);
        sr(png, cx+2, cy-8, 2, 2, '#ffffff', s);
      }
      sp(png, cx-2, cy-7, '#111111', s);
      sp(png, cx+3, cy-7, '#111111', s);
      sp(png, cx-7, cy-2, e.hi, s);
      sp(png, cx+7, cy-4, e.hi, s);
      sp(png, cx-5, cy+3, e.color, s);
      break;
    case 'insect':
      sc(png, cx-2, cy+1, 4, e.color, s);
      sc(png, cx+3, cy, 3, e.color, s);
      sc(png, cx-2, cy+1, 3, e.hi, s);
      sc(png, cx+6, cy-1, 3, e.color, s);
      sp(png, cx+7, cy-2, '#ff0000', s);
      sp(png, cx+8, cy-2, '#ff0000', s);
      sp(png, cx+9, cy, e.dk, s);
      sp(png, cx+10, cy-1, e.dk, s);
      sp(png, cx+9, cy+1, e.dk, s);
      sp(png, cx+10, cy+2, e.dk, s);
      for (let i = -3; i <= 2; i++) {
        sr(png, cx+i*2-1, cy+4, 1, 3, e.dk, s);
        sr(png, cx+i*2+1, cy+4, 1, 3, e.dk, s);
      }
      if (e.id.includes('scorpion')) {
        sr(png, cx-6, cy-1, 2, 2, e.color, s);
        sr(png, cx-8, cy-3, 2, 2, e.color, s);
        sr(png, cx-9, cy-5, 2, 2, e.color, s);
        sp(png, cx-9, cy-7, '#ff0000', s);
      }
      break;
    case 'elem':
      sc(png, cx, cy, 6, e.dk, s);
      sc(png, cx, cy, 5, e.color, s);
      sc(png, cx-1, cy-1, 3, e.hi, s);
      sr(png, cx-3, cy-2, 2, 2, '#ffffff', s);
      sr(png, cx+2, cy-2, 2, 2, '#ffffff', s);
      sp(png, cx-2, cy-1, '#0000aa', s);
      sp(png, cx+3, cy-1, '#0000aa', s);
      const angles = [0, 1.2, 2.4, 3.6, 5.0];
      for (const a of angles) {
        const fx = cx + Math.round(Math.cos(a)*9);
        const fy = cy + Math.round(Math.sin(a)*9);
        sr(png, fx, fy, 2, 2, e.hi, s);
      }
      break;
    case 'serpent':
      for (let t = 0; t < 20; t++) {
        const sx = cx-8+t, sy = cy+Math.round(Math.sin(t*0.5)*4);
        sr(png, sx, sy, 2, 3, e.color, s);
        if (t%3===0) sr(png, sx, sy, 2, 2, e.hi, s);
      }
      sr(png, cx+8, cy-4, 5, 5, e.color, s);
      sr(png, cx+9, cy-3, 3, 3, e.hi, s);
      sp(png, cx+11, cy-3, '#ff0000', s);
      sp(png, cx+9, cy-6, e.hi, s);
      sp(png, cx+10, cy-7, e.hi, s);
      sr(png, cx+12, cy-2, 2, 3, e.dk, s);
      sr(png, cx-10, cy-2, 2, 2, e.color, s);
      sp(png, cx-12, cy-3, e.dk, s);
      break;
  }

  // Frame
  sb(png, 0, 0, 32, 32, P.uiBorderDark, 1, s);
  sb(png, 1, 1, 30, 30, P.uiBorder, 1, s);
  for (const [rx, ry] of [[2,2],[29,2],[2,29],[29,29]]) sp(png, rx, ry, P.uiRivet, s);
  if (e.boss) {
    for (let i = 4; i < 28; i += 4) {
      sp(png, i, 0, '#ff2200', s); sp(png, i, 31, '#ff2200', s);
      sp(png, 0, i, '#ff2200', s); sp(png, 31, i, '#ff2200', s);
    }
  }
  return png;
}

function drawSilhouette(e) {
  const portrait = drawMonsterPortrait(e);
  const size = 128, s = 4;
  const png = createImage(size, size);
  sr(png, 0, 0, 32, 32, '#0a0a1a', s);

  // Convert portrait to dark silhouette
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(portrait, x, y);
      const bright = (r+g+b)/3;
      const isOrange = (r > 100 && g > 50 && g < 170 && b < 60);
      const isDark = bright < 30;
      if (!isDark && !isOrange) {
        const idx = (png.width * y + x) << 2;
        png.data[idx] = 20; png.data[idx+1] = 15; png.data[idx+2] = 40; png.data[idx+3] = 200;
      }
    }
  }

  // ? mark
  const qx = 14, qy = 14;
  const qGlyph = [[0,1,0],[1,0,1],[0,0,1],[0,1,0],[0,1,0]];
  for (let row = 0; row < 5; row++)
    for (let col = 0; col < 3; col++)
      if (qGlyph[row][col]) sr(png, qx+col, qy+row, 1, 1, '#3a3a5a', s);

  sb(png, 0, 0, 32, 32, '#1a1a2e', 1, s);
  sb(png, 1, 1, 30, 30, '#2a2a3e', 1, s);
  return png;
}

// === UI FRAMES ===

function generateBookFrame() {
  console.log('Generating bestiary book frame...');
  const w = 512, h = 384, s = 2;
  const png = createImage(w, h);
  // Leather cover
  sr(png, 0, 0, 256, 192, '#3a2010', s);
  // Spine
  sr(png, 124, 0, 8, 192, '#2a1508', s);
  // Left page
  sr(png, 8, 8, 116, 176, P.pageParchment, s);
  sr(png, 10, 10, 112, 172, '#f0e0c4', s);
  // Right page
  sr(png, 132, 8, 116, 176, P.pageParchment, s);
  sr(png, 134, 10, 112, 172, '#f0e0c4', s);
  // Page lines
  for (let y = 30; y < 170; y += 8) {
    sr(png, 16, y, 100, 1, P.pageLines, s);
    sr(png, 140, y, 100, 1, P.pageLines, s);
  }
  // Binding
  sr(png, 125, 10, 6, 5, '#c4841d', s);
  sr(png, 125, 87, 6, 5, '#c4841d', s);
  sr(png, 125, 177, 6, 5, '#c4841d', s);
  // Corner ornaments
  for (const [ox, oy, dx, dy] of [[2,2,1,1],[246,2,-1,1],[2,189,1,-1],[246,189,-1,-1]]) {
    sr(png, ox, oy, 8*dx||8, 1, P.uiBorder, s);
    sr(png, ox, oy, 1, 8*dy||8, P.uiBorder, s);
  }
  savePng(png, 'ui_bestiary_book_frame.png');
}

function generatePageBgLeft() {
  console.log('Generating page background (left)...');
  const w = 256, h = 384, s = 2;
  const png = createImage(w, h);
  sr(png, 0, 0, 128, 192, P.pageParchment, s);
  sr(png, 2, 2, 124, 188, '#f0e0c4', s);
  for (const [sx, sy] of [[20,40],[80,100],[50,150],[90,30],[30,120]]) {
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (dx*dx+dy*dy <= 9) sp(png, sx+dx, sy+dy, P.pageDark, s);
  }
  for (let y = 20; y < 185; y += 8) sr(png, 8, y, 112, 1, P.pageLines, s);
  sr(png, 124, 0, 4, 192, P.pageShadow, s);
  savePng(png, 'ui_bestiary_page_left.png');
}

function generatePageBgRight() {
  console.log('Generating page background (right)...');
  const w = 256, h = 384, s = 2;
  const png = createImage(w, h);
  sr(png, 0, 0, 128, 192, P.pageParchment, s);
  sr(png, 2, 2, 124, 188, '#f0e0c4', s);
  for (const [sx, sy] of [[40,60],[100,80],[30,140],[70,20],[110,160]]) {
    for (let dy = -3; dy <= 3; dy++)
      for (let dx = -3; dx <= 3; dx++)
        if (dx*dx+dy*dy <= 9) sp(png, sx+dx, sy+dy, P.pageDark, s);
  }
  for (let y = 20; y < 185; y += 8) sr(png, 8, y, 112, 1, P.pageLines, s);
  sr(png, 0, 0, 4, 192, P.pageShadow, s);
  savePng(png, 'ui_bestiary_page_right.png');
}

function generateEntryFrame() {
  console.log('Generating monster entry frame...');
  const w = 256, h = 192, s = 2;
  const png = createImage(w, h);
  sr(png, 0, 0, 128, 96, P.uiDark, s);
  sr(png, 1, 1, 126, 94, P.uiBg, s);
  // Portrait slot
  sr(png, 4, 4, 36, 36, '#0a0a1e', s);
  sb(png, 4, 4, 36, 36, P.uiBorderDark, 1, s);
  // Info area
  sr(png, 44, 4, 80, 36, P.uiMid, s);
  sr(png, 44, 4, 80, 8, P.uiBorderDark, s);
  for (let y = 16; y < 36; y += 6) sr(png, 48, y, 72, 1, P.uiBorderDark, s);
  // Loot section
  sr(png, 4, 44, 120, 24, P.uiMid, s);
  sb(png, 4, 44, 120, 24, P.uiBorderDark, 1, s);
  for (let i = 0; i < 4; i++) {
    sr(png, 8+i*28, 48, 20, 16, '#0a0a1e', s);
    sb(png, 8+i*28, 48, 20, 16, P.uiBorderDark, 1, s);
  }
  // Description
  sr(png, 4, 72, 120, 20, P.uiMid, s);
  for (let y = 76; y < 88; y += 4) sr(png, 8, y, 112, 1, P.uiBorderDark, s);
  // Frame
  sb(png, 0, 0, 128, 96, P.uiBorder, 1, s);
  for (const [rx, ry] of [[1,1],[126,1],[1,94],[126,94]]) sp(png, rx, ry, P.uiRivet, s);
  savePng(png, 'ui_bestiary_entry_frame.png');
}

// === BIOME ICONS (32x32) ===

function generateBiomeIcon(name, bio) {
  const png = createImage(32, 32);
  fillRect(png, 0, 0, 32, 32, bio.bg);
  switch (name) {
    case 'forest':
      fillCircle(png, 10, 12, 5, '#2d5a1e');
      fillCircle(png, 10, 11, 4, '#4a8a2e');
      fillRect(png, 9, 17, 2, 5, '#5a3a1a');
      fillCircle(png, 22, 14, 4, '#2d5a1e');
      fillCircle(png, 22, 13, 3, '#4a8a2e');
      fillRect(png, 21, 18, 2, 4, '#5a3a1a');
      fillRect(png, 0, 26, 32, 6, '#3a5a1e');
      break;
    case 'ice':
      fillRect(png, 0, 24, 32, 8, '#8abada');
      for (let y = 0; y < 20; y++) {
        const hw = Math.floor((20-y)*0.7);
        fillRect(png, 16-hw, 6+y, hw*2, 1, '#a0c8e8');
      }
      for (let y = 0; y < 8; y++) {
        const hw = Math.floor((8-y)*0.7);
        fillRect(png, 16-hw, 6+y, hw*2, 1, '#e0f0ff');
      }
      setPixel(png, 5, 8, '#ffffff'); setPixel(png, 25, 12, '#ffffff');
      break;
    case 'desert':
      fillRect(png, 0, 18, 32, 14, '#e8b84a');
      for (let x = 0; x < 32; x++) {
        const dh = Math.floor(Math.sin(x*0.3)*3+3);
        fillRect(png, x, 18-dh, 1, dh, '#c4941a');
      }
      fillCircle(png, 24, 8, 4, '#f0d878');
      fillCircle(png, 24, 8, 3, '#ffe890');
      fillRect(png, 8, 12, 2, 8, '#4a8a2e');
      fillRect(png, 6, 14, 2, 2, '#4a8a2e');
      break;
    case 'volcanic':
      for (let y = 0; y < 22; y++) {
        const hw = Math.floor((22-y)*0.6)+2;
        fillRect(png, 16-hw, 8+y, hw*2, 1, '#4a2a1a');
      }
      fillRect(png, 13, 8, 6, 3, '#2a0a00');
      fillRect(png, 14, 6, 4, 3, '#ff4a0a');
      fillRect(png, 15, 5, 2, 2, '#ff8a2a');
      fillRect(png, 0, 28, 32, 4, '#8a2a1a');
      fillRect(png, 4, 28, 8, 2, '#c44a2a');
      break;
    case 'dungeon':
      fillRect(png, 0, 0, 32, 32, '#2a2a3a');
      fillRect(png, 8, 4, 16, 24, '#1a1a2a');
      fillRect(png, 6, 2, 20, 4, '#4a4a5a');
      fillRect(png, 6, 4, 3, 24, '#3a3a4a');
      fillRect(png, 23, 4, 3, 24, '#3a3a4a');
      fillRect(png, 14, 10, 4, 1, '#c4841d');
      fillRect(png, 15, 8, 2, 2, '#ff8a2a');
      setPixel(png, 16, 7, '#ffcc44');
      break;
    case 'ocean':
      fillRect(png, 0, 0, 32, 12, '#2a6a9a');
      fillRect(png, 0, 12, 32, 20, '#1a4a7a');
      for (let x = 0; x < 32; x++) {
        const wy = Math.floor(Math.sin(x*0.5)*2);
        fillRect(png, x, 12+wy, 1, 2, '#4a9aca');
      }
      fillRect(png, 8, 20, 4, 2, '#8ac0e0');
      setPixel(png, 20, 16, '#a0d8ff'); setPixel(png, 22, 14, '#a0d8ff');
      break;
  }
  drawBorder(png, 0, 0, 32, 32, P.uiBorderDark, 1);
  drawBorder(png, 1, 1, 30, 30, P.uiBorder, 1);
  return png;
}

// === LOOT ICONS (32x32) ===

const LOOT = [
  { id: 'bone', c: '#d0c8b0', hi: '#e8e0d0', dk: '#908870', sh: 'bone' },
  { id: 'fang', c: '#e0d8c0', hi: '#f0ece0', dk: '#a09880', sh: 'fang' },
  { id: 'hide', c: '#8a6a3a', hi: '#aa8a5a', dk: '#5a4a2a', sh: 'hide' },
  { id: 'claw', c: '#c0b090', hi: '#e0d0b0', dk: '#807060', sh: 'claw' },
  { id: 'scale', c: '#4a8a6a', hi: '#6aaa8a', dk: '#2a5a4a', sh: 'scale' },
  { id: 'essence_fire', c: '#e84a2a', hi: '#ff7a5a', dk: '#a02a0a', sh: 'orb' },
  { id: 'essence_ice', c: '#4a9aca', hi: '#8acafa', dk: '#2a5a8a', sh: 'orb' },
  { id: 'essence_shadow', c: '#6a3a8a', hi: '#9a5aba', dk: '#3a0a5a', sh: 'orb' },
  { id: 'venom_sac', c: '#4aaa2a', hi: '#6ad44a', dk: '#2a7a0a', sh: 'sac' },
  { id: 'crystal_shard', c: '#6ae0ff', hi: '#a0f0ff', dk: '#3a90a0', sh: 'crystal' },
  { id: 'cursed_relic', c: '#8a2a6a', hi: '#ba4a8a', dk: '#5a0a4a', sh: 'relic' },
  { id: 'ancient_coin', c: '#c4a41a', hi: '#e8c84a', dk: '#8a6a0a', sh: 'coin' },
];

function generateLootIcon(item) {
  const png = createImage(32, 32);
  const cx = 16, cy = 16;
  fillRect(png, 0, 0, 32, 32, P.uiDark);
  switch (item.sh) {
    case 'bone':
      fillRect(png, 10, 14, 12, 4, item.c);
      fillCircle(png, 10, 14, 2, item.hi);
      fillCircle(png, 10, 18, 2, item.hi);
      fillCircle(png, 22, 14, 2, item.hi);
      fillCircle(png, 22, 18, 2, item.hi);
      fillRect(png, 11, 15, 10, 2, item.c);
      break;
    case 'fang':
      for (let y = 0; y < 14; y++) {
        const hw = Math.max(1, Math.floor((14-y)*0.4));
        fillRect(png, cx-hw, 8+y, hw*2, 1, item.c);
      }
      fillRect(png, cx-1, 8, 2, 4, item.hi);
      break;
    case 'hide':
      fillRect(png, 8, 10, 16, 12, item.c);
      fillRect(png, 10, 12, 12, 8, item.hi);
      for (let i = 0; i < 6; i++) setPixel(png, 11+i*2, 14+(i%2)*3, item.dk);
      break;
    case 'claw':
      fillRect(png, 12, 8, 3, 10, item.c);
      fillRect(png, 14, 6, 3, 4, item.c);
      fillRect(png, 16, 5, 2, 3, item.hi);
      fillRect(png, 13, 9, 1, 6, item.hi);
      break;
    case 'scale':
      fillDiamond(png, cx, cy, 8, item.c);
      fillDiamond(png, cx, cy, 6, item.hi);
      fillDiamond(png, cx, cy-1, 4, item.c);
      fillRect(png, cx-1, cy-3, 2, 1, item.dk);
      fillRect(png, cx-2, cy, 4, 1, item.dk);
      break;
    case 'orb':
      fillCircle(png, cx, cy, 7, item.dk);
      fillCircle(png, cx, cy, 6, item.c);
      fillCircle(png, cx-2, cy-2, 3, item.hi);
      setPixel(png, cx-3, cy-3, '#ffffff');
      break;
    case 'sac':
      fillCircle(png, cx, cy+1, 7, item.dk);
      fillCircle(png, cx, cy, 6, item.c);
      fillCircle(png, cx-1, cy-1, 4, item.hi);
      fillRect(png, cx, cy+7, 2, 3, item.c);
      break;
    case 'crystal':
      for (let y = -8; y <= 8; y++) {
        const hw = y < 0 ? Math.floor(3+y*0.3) : Math.floor(3-y*0.3);
        if (hw > 0) fillRect(png, cx-hw, cy+y, hw*2, 1, item.c);
      }
      fillRect(png, cx-1, cy-6, 2, 4, item.hi);
      setPixel(png, cx-1, cy-5, '#ffffff');
      break;
    case 'relic':
      fillCircle(png, cx, cy-2, 5, item.dk);
      fillCircle(png, cx, cy-2, 4, item.c);
      fillCircle(png, cx, cy-2, 2, item.hi);
      fillRect(png, cx-1, cy-8, 2, 3, '#8a8a8a');
      fillRect(png, cx-1, cy+2, 2, 4, item.c);
      setPixel(png, cx, cy-2, '#ffffff');
      break;
    case 'coin':
      fillCircle(png, cx, cy, 7, item.dk);
      fillCircle(png, cx, cy, 6, item.c);
      fillCircle(png, cx, cy, 4, item.hi);
      fillCircle(png, cx, cy, 2, item.c);
      setPixel(png, cx, cy, item.dk);
      break;
  }
  drawBorder(png, 0, 0, 32, 32, P.uiBorderDark, 1);
  return png;
}

// === BADGES (32x32) ===

const BADGES = [
  { id: 'badge_novice', c: '#8a7a5a', hi: '#b0a080', dk: '#5a4a3a', stars: 1 },
  { id: 'badge_apprentice', c: '#4a8a4a', hi: '#6aaa6a', dk: '#2a5a2a', stars: 2 },
  { id: 'badge_expert', c: '#4a6aaa', hi: '#6a8aca', dk: '#2a4a7a', stars: 3 },
  { id: 'badge_master', c: '#aa6a2a', hi: '#ca8a4a', dk: '#7a4a0a', stars: 4 },
  { id: 'badge_legendary', c: '#aa3a6a', hi: '#ca5a8a', dk: '#7a1a4a', stars: 5 },
  { id: 'badge_complete', c: '#c4a41a', hi: '#e8c84a', dk: '#8a6a0a', stars: 5 },
  { id: 'achieve_first_entry', c: '#4a8a2e', hi: '#6aaa4e', dk: '#2a5a0e' },
  { id: 'achieve_boss_hunter', c: '#aa2a1a', hi: '#ca4a3a', dk: '#7a0a0a' },
  { id: 'achieve_biome_master', c: '#2a6a9a', hi: '#4a8aba', dk: '#0a4a6a' },
  { id: 'achieve_loot_collector', c: '#c4841d', hi: '#e8a83d', dk: '#8a5a0d' },
];

function generateBadge(b) {
  const png = createImage(32, 32);
  const cx = 16, cy = 16;
  fillRect(png, 0, 0, 32, 32, P.uiDark);

  if (b.id.startsWith('badge_')) {
    // Shield
    fillRect(png, 8, 4, 16, 16, b.dk);
    fillRect(png, 9, 5, 14, 14, b.c);
    for (let y = 0; y < 8; y++) {
      const hw = Math.max(1, 8-y);
      fillRect(png, cx-hw, 20+y, hw*2, 1, b.c);
      if (y > 0) fillRect(png, cx-hw+1, 20+y, hw*2-2, 1, b.hi);
    }
    fillRect(png, 10, 6, 12, 12, b.hi);
    fillRect(png, 12, 8, 8, 8, b.c);
    if (b.stars) {
      const startX = cx - Math.floor(b.stars*2);
      for (let i = 0; i < b.stars; i++) {
        setPixel(png, startX+i*4, 10, '#ffffff');
        setPixel(png, startX+i*4-1, 11, '#ffffff');
        setPixel(png, startX+i*4+1, 11, '#ffffff');
      }
    }
  } else {
    // Medal
    fillCircle(png, cx, cy, 11, b.dk);
    fillCircle(png, cx, cy, 10, b.c);
    fillCircle(png, cx, cy, 8, b.hi);
    fillCircle(png, cx, cy, 6, b.c);
    if (b.id === 'achieve_first_entry') {
      fillCircle(png, cx-1, cy-1, 3, '#ffffff');
      fillCircle(png, cx-1, cy-1, 2, b.c);
      fillRect(png, cx+1, cy+1, 4, 1, '#ffffff');
      fillRect(png, cx+2, cy+2, 3, 1, '#ffffff');
    } else if (b.id === 'achieve_boss_hunter') {
      fillCircle(png, cx, cy-1, 3, '#ffffff');
      fillRect(png, cx-2, cy+1, 4, 2, '#ffffff');
      setPixel(png, cx-1, cy-2, '#111111'); setPixel(png, cx+1, cy-2, '#111111');
      fillRect(png, cx-1, cy+1, 2, 1, '#111111');
    } else if (b.id === 'achieve_biome_master') {
      fillCircle(png, cx, cy, 3, '#4a9a4a');
      fillRect(png, cx-3, cy, 6, 1, '#2a6a9a');
      fillRect(png, cx, cy-3, 1, 6, '#2a6a9a');
    } else if (b.id === 'achieve_loot_collector') {
      fillRect(png, cx-3, cy-1, 6, 4, '#8a5a1a');
      fillRect(png, cx-3, cy-2, 6, 2, '#aa7a3a');
      setPixel(png, cx, cy-1, '#f0c000');
    }
    // Ribbons
    fillRect(png, cx-4, cy+10, 3, 4, b.c);
    fillRect(png, cx+2, cy+10, 3, 4, b.c);
  }
  drawBorder(png, 0, 0, 32, 32, P.uiBorderDark, 1);
  return png;
}

// === MAIN ===

function main() {
  console.log('=== Bestiary Asset Generation (PIX-367) ===\n');

  console.log('--- UI Frames & Backgrounds ---');
  generateBookFrame();
  generatePageBgLeft();
  generatePageBgRight();
  generateEntryFrame();

  console.log('\n--- Monster Portraits (128x128) ---');
  for (const e of ENEMIES) savePng(drawMonsterPortrait(e), `portrait_${e.id}.png`);

  console.log('\n--- Monster Silhouettes (128x128) ---');
  for (const e of ENEMIES) savePng(drawSilhouette(e), `silhouette_${e.id}.png`);

  console.log('\n--- Habitat/Biome Icons (32x32) ---');
  for (const name of ['forest','ice','desert','volcanic','dungeon','ocean'])
    savePng(generateBiomeIcon(name, P[name]), `icon_biome_${name}.png`);

  console.log('\n--- Loot Drop Icons (32x32) ---');
  for (const item of LOOT) savePng(generateLootIcon(item), `icon_loot_${item.id}.png`);

  console.log('\n--- Completion Badges & Achievement Icons (32x32) ---');
  for (const b of BADGES) savePng(generateBadge(b), `icon_${b.id}.png`);

  const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png'));
  console.log(`\n=== Done! Generated ${files.length} assets in public/assets/bestiary/ ===`);
}

main();
