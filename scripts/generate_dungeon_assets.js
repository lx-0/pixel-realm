#!/usr/bin/env node
/**
 * Dungeon Art Asset Generator for PixelRealm
 * PIX-397: Procedural dungeon tileset and room art assets
 *
 * Generates:
 * - Ancient ruins dungeon tileset (new theme)
 * - Procedural-ready auto-tile tilesets (stone, crystal, lava, ruins)
 * - Room decoration sprites (torch, altar, pillar, rubble, barrel)
 * - Dungeon entrance/exit portal variants
 * - Boss room environment art
 * - Minimap tile icons
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Master Palette ──────────────────────────────────────────────────
const PAL = {
  // Neutrals
  shadowBlack:   [0x0d, 0x0d, 0x0d],
  darkRock:      [0x2b, 0x2b, 0x2b],
  stoneGray:     [0x4a, 0x4a, 0x4a],
  midGray:       [0x6e, 0x6e, 0x6e],
  lightStone:    [0x96, 0x96, 0x96],
  paleGray:      [0xc8, 0xc8, 0xc8],
  nearWhite:     [0xf0, 0xf0, 0xf0],
  // Warm earth
  deepSoil:      [0x3b, 0x20, 0x10],
  richEarth:     [0x6b, 0x3a, 0x1f],
  dirt:          [0x8b, 0x5c, 0x2a],
  sand:          [0xb8, 0x84, 0x3f],
  desertGold:    [0xd4, 0xa8, 0x5a],
  // Greens
  deepForest:    [0x1a, 0x3a, 0x1a],
  forestGreen:   [0x2d, 0x6e, 0x2d],
  leafGreen:     [0x4c, 0x9b, 0x4c],
  brightGrass:   [0x78, 0xc8, 0x78],
  // Blues
  deepOcean:     [0x0a, 0x1a, 0x3a],
  oceanBlue:     [0x1a, 0x4a, 0x8a],
  skyBlue:       [0x2a, 0x7a, 0xc0],
  playerBlue:    [0x50, 0xa8, 0xe8],
  iceBlue:       [0x90, 0xd0, 0xf8],
  shimmer:       [0xc8, 0xf0, 0xff],
  // Reds
  deepBlood:     [0x5a, 0x0a, 0x0a],
  enemyRed:      [0xa0, 0x10, 0x10],
  brightRed:     [0xd4, 0x20, 0x20],
  fireOrange:    [0xf0, 0x60, 0x20],
  ember:         [0xf8, 0xa0, 0x60],
  // Yellows
  darkGold:      [0xa8, 0x70, 0x00],
  gold:          [0xe8, 0xb8, 0x00],
  brightYellow:  [0xff, 0xe0, 0x40],
  paleHighlight: [0xff, 0xf8, 0xa0],
  // Purples
  deepMagic:     [0x1a, 0x0a, 0x3a],
  magicPurple:   [0x5a, 0x20, 0xa0],
  manaViolet:    [0x90, 0x50, 0xe0],
  spellGlow:     [0xd0, 0x90, 0xff],
};

const TRANSPARENT = [0, 0, 0, 0];

// ── PNG Encoder (pure Node.js) ──────────────────────────────────────
function createPNG(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crc32Table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crc32Table[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, c]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  const stride = 1 + width * 4;
  const rawData = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    rawData[y * stride] = 0;
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 4;
      const di = y * stride + 1 + x * 4;
      rawData[di]   = pixels[si];
      rawData[di+1] = pixels[si+1];
      rawData[di+2] = pixels[si+2];
      rawData[di+3] = pixels[si+3];
    }
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 })),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// ── Drawing Helpers ─────────────────────────────────────────────────
class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 4); // starts transparent
  }

  setPixel(x, y, color) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (color.length === 4) {
      this.data[i] = color[0]; this.data[i+1] = color[1];
      this.data[i+2] = color[2]; this.data[i+3] = color[3];
    } else {
      this.data[i] = color[0]; this.data[i+1] = color[1];
      this.data[i+2] = color[2]; this.data[i+3] = 255;
    }
  }

  fillRect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        this.setPixel(x + dx, y + dy, color);
  }

  // Draw a horizontal line
  hline(x, y, len, color) {
    for (let i = 0; i < len; i++) this.setPixel(x + i, y, color);
  }

  // Draw a vertical line
  vline(x, y, len, color) {
    for (let i = 0; i < len; i++) this.setPixel(x, y + i, color);
  }

  // Fill a 16x16 tile area at tile grid coords
  fillTile(tx, ty, color) {
    this.fillRect(tx * 16, ty * 16, 16, 16, color);
  }

  // Seeded noise for variation
  noise(x, y, seed = 0) {
    let n = (x * 374761393 + y * 668265263 + seed * 1274126177) & 0x7fffffff;
    n = (n ^ (n >> 13)) * 1274126177;
    n = n ^ (n >> 16);
    return (n & 0xff) / 255;
  }

  // Mix two colors
  mix(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t),
    ];
  }

  // Pick from palette based on noise
  noisePick(x, y, seed, colors) {
    const n = this.noise(x, y, seed);
    return colors[Math.floor(n * colors.length) % colors.length];
  }

  toPNG() {
    return createPNG(this.w, this.h, this.data);
  }

  save(filepath) {
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filepath, this.toPNG());
    console.log(`  ✓ ${path.basename(filepath)} (${this.w}x${this.h})`);
  }
}

// ── Asset Paths ─────────────────────────────────────────────────────
const BASE = '/host-workdir/companies/PixelForgeStudios/projects/PixelRealm/assets';
const TILES = `${BASE}/tiles/tilesets`;
const SPRITES = `${BASE}/sprites/dungeon`;
const UI = `${BASE}/ui`;

// ── Tile Drawing Functions ──────────────────────────────────────────

function drawStoneFloor(canvas, ox, oy, palette, seed) {
  const { base, dark, light, crack } = palette;
  canvas.fillRect(ox, oy, 16, 16, base);
  // Stone texture with noise
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = canvas.noise(x + ox, y + oy, seed);
      if (n > 0.8) canvas.setPixel(ox + x, oy + y, light);
      else if (n < 0.15) canvas.setPixel(ox + x, oy + y, dark);
    }
  }
  // Grout lines
  if (canvas.noise(ox, oy, seed + 50) > 0.4) {
    canvas.hline(ox, oy + 7, 16, crack);
    canvas.vline(ox + 7, oy, 8, crack);
    canvas.vline(ox + 11, oy + 8, 8, crack);
  }
}

function drawStoneWall(canvas, ox, oy, palette, seed, side) {
  const { base, dark, light, highlight } = palette;
  canvas.fillRect(ox, oy, 16, 16, base);
  // Brick pattern
  for (let row = 0; row < 4; row++) {
    const ry = oy + row * 4;
    canvas.hline(ox, ry, 16, dark);
    const offset = (row % 2 === 0) ? 0 : 8;
    canvas.vline(ox + offset, ry, 4, dark);
    canvas.vline(ox + offset + 8, ry, 4, dark);
    // Highlights on bricks
    for (let x = 0; x < 16; x++) {
      for (let y = 1; y < 4; y++) {
        const n = canvas.noise(ox + x, ry + y, seed + row);
        if (n > 0.85) canvas.setPixel(ox + x, ry + y, light);
      }
    }
  }
  // Side indicator
  if (side === 'top') canvas.hline(ox, oy, 16, highlight);
  if (side === 'bottom') canvas.hline(ox, oy + 15, 16, highlight);
  if (side === 'left') canvas.vline(ox, oy, 16, highlight);
  if (side === 'right') canvas.vline(ox + 15, oy, 16, highlight);
}

function drawCorner(canvas, ox, oy, palette, seed, type) {
  const { base, dark, highlight } = palette;
  canvas.fillRect(ox, oy, 16, 16, base);
  // Fill with brick pattern
  for (let row = 0; row < 4; row++) {
    const ry = oy + row * 4;
    canvas.hline(ox, ry, 16, dark);
    const offset = (row % 2 === 0) ? 0 : 8;
    canvas.vline(ox + offset, ry, 4, dark);
    canvas.vline(ox + offset + 8, ry, 4, dark);
  }
  // Corner highlights
  if (type === 'tl') { canvas.hline(ox, oy, 16, highlight); canvas.vline(ox, oy, 16, highlight); }
  if (type === 'tr') { canvas.hline(ox, oy, 16, highlight); canvas.vline(ox+15, oy, 16, highlight); }
  if (type === 'bl') { canvas.hline(ox, oy+15, 16, highlight); canvas.vline(ox, oy, 16, highlight); }
  if (type === 'br') { canvas.hline(ox, oy+15, 16, highlight); canvas.vline(ox+15, oy, 16, highlight); }
}

function drawVoidTile(canvas, ox, oy) {
  canvas.fillRect(ox, oy, 16, 16, PAL.shadowBlack);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (canvas.noise(x + ox, y + oy, 999) > 0.95) {
        canvas.setPixel(ox + x, oy + y, PAL.darkRock);
      }
    }
  }
}

// ── Theme Palettes ──────────────────────────────────────────────────
const THEMES = {
  stone: {
    base: PAL.stoneGray, dark: PAL.darkRock, light: PAL.midGray,
    highlight: PAL.lightStone, crack: PAL.darkRock, accent: PAL.midGray,
    floor_base: PAL.darkRock, floor_dark: PAL.shadowBlack, floor_light: PAL.stoneGray,
  },
  crystal: {
    base: PAL.deepMagic, dark: PAL.shadowBlack, light: PAL.magicPurple,
    highlight: PAL.manaViolet, crack: PAL.deepMagic, accent: PAL.spellGlow,
    floor_base: PAL.deepMagic, floor_dark: PAL.shadowBlack, floor_light: PAL.magicPurple,
  },
  lava: {
    base: PAL.darkRock, dark: PAL.shadowBlack, light: PAL.stoneGray,
    highlight: PAL.fireOrange, crack: PAL.brightRed, accent: PAL.ember,
    floor_base: PAL.deepBlood, floor_dark: PAL.shadowBlack, floor_light: PAL.enemyRed,
  },
  ruins: {
    base: PAL.richEarth, dark: PAL.deepSoil, light: PAL.dirt,
    highlight: PAL.sand, crack: PAL.deepSoil, accent: PAL.desertGold,
    floor_base: PAL.deepSoil, floor_dark: PAL.shadowBlack, floor_light: PAL.richEarth,
    vine: PAL.deepForest, moss: PAL.forestGreen,
  },
};

// ── Generate Procedural Tileset (256x64, 16x4 tiles) ────────────────
function generateProcTileset(theme, filename) {
  const c = new PixelCanvas(256, 64);
  const pal = THEMES[theme];
  const floorPal = { base: pal.floor_base, dark: pal.floor_dark, light: pal.floor_light, crack: pal.crack };

  // Row 0 (y=0): Floor variants (0-7), Wall sides (8-11: T,B,L,R), Outer corners (12-15: TL,TR,BL,BR)
  for (let i = 0; i < 8; i++) drawStoneFloor(c, i * 16, 0, floorPal, i * 17 + 1);
  drawStoneWall(c, 128, 0, pal, 100, 'top');
  drawStoneWall(c, 144, 0, pal, 101, 'bottom');
  drawStoneWall(c, 160, 0, pal, 102, 'left');
  drawStoneWall(c, 176, 0, pal, 103, 'right');
  drawCorner(c, 192, 0, pal, 200, 'tl');
  drawCorner(c, 208, 0, pal, 201, 'tr');
  drawCorner(c, 224, 0, pal, 202, 'bl');
  drawCorner(c, 240, 0, pal, 203, 'br');

  // Row 1 (y=16): Inner corners (0-3), T-junctions (4-7), Wall variants (8-15)
  // Inner corners (wall on two adjacent sides)
  for (let i = 0; i < 4; i++) {
    const types = ['tl', 'tr', 'bl', 'br'];
    const ox = i * 16;
    const oy = 16;
    c.fillRect(ox, oy, 16, 16, pal.base);
    // Brick fill
    for (let row = 0; row < 4; row++) {
      c.hline(ox, oy + row * 4, 16, pal.dark);
      const off = (row % 2 === 0) ? 0 : 8;
      c.vline(ox + off, oy + row * 4, 4, pal.dark);
      c.vline(ox + off + 8, oy + row * 4, 4, pal.dark);
    }
    // Inner corner: floor area in one corner
    const t = types[i];
    const fx = t.includes('r') ? ox : ox + 8;
    const fy = t.includes('b') ? oy : oy + 8;
    drawStoneFloor(c, fx, fy, floorPal, 300 + i);
    // Crop to 8x8 floor patch by re-drawing wall on the rest
    if (t === 'tl') { c.hline(ox, oy + 8, 8, pal.highlight); c.vline(ox + 8, oy, 8, pal.highlight); }
    if (t === 'tr') { c.hline(ox + 8, oy + 8, 8, pal.highlight); c.vline(ox + 7, oy, 8, pal.highlight); }
    if (t === 'bl') { c.hline(ox, oy + 7, 8, pal.highlight); c.vline(ox + 8, oy + 8, 8, pal.highlight); }
    if (t === 'br') { c.hline(ox + 8, oy + 7, 8, pal.highlight); c.vline(ox + 7, oy + 8, 8, pal.highlight); }
  }

  // T-junctions (4-7)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 4) * 16;
    const oy = 16;
    drawStoneWall(c, ox, oy, pal, 400 + i, ['top', 'bottom', 'left', 'right'][i]);
    // Cross highlight for T-junction
    c.hline(ox + 6, oy + 8, 4, pal.highlight);
    c.vline(ox + 8, oy + 6, 4, pal.highlight);
  }

  // Wall variants (8-15): cracked, mossy, damaged
  for (let i = 0; i < 8; i++) {
    const ox = (i + 8) * 16;
    drawStoneWall(c, ox, 16, pal, 500 + i * 3, '');
    // Add variety: cracks, damage
    if (i < 3) {
      // Cracks
      for (let j = 0; j < 3 + i; j++) {
        const cx = ox + Math.floor(c.noise(i, j, 510) * 14) + 1;
        const cy = 16 + Math.floor(c.noise(j, i, 511) * 14) + 1;
        c.setPixel(cx, cy, pal.crack);
        c.setPixel(cx + 1, cy + 1, pal.crack);
      }
    }
    if (theme === 'ruins' && i >= 3 && i < 6) {
      // Moss/vine accents for ruins
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (c.noise(ox + x, 16 + y, 600 + i) > 0.88) {
            c.setPixel(ox + x, 16 + y, pal.vine || PAL.deepForest);
          }
          if (c.noise(ox + x, 16 + y, 700 + i) > 0.92) {
            c.setPixel(ox + x, 16 + y, pal.moss || PAL.forestGreen);
          }
        }
      }
    }
    if (theme === 'crystal' && i >= 3) {
      // Crystal shard accents
      for (let j = 0; j < 2; j++) {
        const sx = ox + 3 + Math.floor(c.noise(i, j, 620) * 10);
        const sy = 18 + Math.floor(c.noise(j, i, 621) * 10);
        c.setPixel(sx, sy, PAL.spellGlow);
        c.setPixel(sx, sy - 1, PAL.manaViolet);
        c.setPixel(sx, sy - 2, PAL.magicPurple);
      }
    }
    if (theme === 'lava' && i >= 5) {
      // Lava glow seeping through cracks
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (c.noise(ox + x, 16 + y, 630 + i) > 0.9) {
            c.setPixel(ox + x, 16 + y, PAL.fireOrange);
          }
        }
      }
    }
  }

  // Row 2 (y=32): Decorative floor variants (16 tiles)
  for (let i = 0; i < 16; i++) {
    const ox = i * 16;
    drawStoneFloor(c, ox, 32, floorPal, 700 + i * 13);
    // Add decorative elements
    if (i < 4) {
      // Cracked floor
      const cx = ox + 4 + Math.floor(c.noise(i, 0, 710) * 8);
      c.vline(cx, 33, 6, pal.crack);
      c.setPixel(cx + 1, 35, pal.crack);
      c.setPixel(cx - 1, 37, pal.crack);
    } else if (i < 8) {
      // Rubble spots
      for (let j = 0; j < 3; j++) {
        const rx = ox + 2 + Math.floor(c.noise(i, j, 720) * 12);
        const ry = 34 + Math.floor(c.noise(j, i, 721) * 10);
        c.setPixel(rx, ry, pal.light);
        c.setPixel(rx + 1, ry, pal.dark);
      }
    } else if (i < 12 && theme === 'lava') {
      // Lava pool on floor
      for (let y = 4; y < 12; y++) {
        for (let x = 4; x < 12; x++) {
          const n = c.noise(ox + x, 32 + y, 730 + i);
          if (n > 0.4 && x > 5 && x < 11 && y > 5 && y < 11) {
            c.setPixel(ox + x, 32 + y, n > 0.7 ? PAL.brightYellow : PAL.fireOrange);
          } else if (n > 0.3 && x > 4 && x < 12 && y > 4 && y < 12) {
            c.setPixel(ox + x, 32 + y, PAL.brightRed);
          }
        }
      }
    } else if (i < 12 && theme === 'crystal') {
      // Crystal floor accents
      const cx = ox + 6 + (i % 4);
      c.setPixel(cx, 36, PAL.spellGlow);
      c.setPixel(cx, 37, PAL.manaViolet);
      c.setPixel(cx - 1, 38, PAL.magicPurple);
      c.setPixel(cx + 1, 38, PAL.magicPurple);
      c.setPixel(cx, 39, PAL.deepMagic);
    } else if (i >= 12) {
      // Marked/patterned tiles
      c.hline(ox + 3, 35, 10, pal.accent || pal.highlight);
      c.hline(ox + 3, 44, 10, pal.accent || pal.highlight);
      c.vline(ox + 3, 35, 10, pal.accent || pal.highlight);
      c.vline(ox + 12, 35, 10, pal.accent || pal.highlight);
    }
  }

  // Row 3 (y=48): Void/ceiling (0-3), Door tiles (4-7), Special (8-15)
  for (let i = 0; i < 4; i++) drawVoidTile(c, i * 16, 48);

  // Door tiles
  for (let i = 0; i < 4; i++) {
    const ox = (i + 4) * 16;
    const doorColors = [pal.dark, pal.base, pal.light, pal.highlight];
    c.fillRect(ox, 48, 16, 16, pal.dark);
    // Door frame
    c.vline(ox + 2, 48, 16, pal.highlight);
    c.vline(ox + 13, 48, 16, pal.highlight);
    c.hline(ox + 2, 48, 12, pal.highlight);
    // Door fill
    c.fillRect(ox + 3, 49, 10, 15, doorColors[i]);
    // Handle
    c.setPixel(ox + 10, 56, PAL.gold);
    c.setPixel(ox + 10, 57, PAL.darkGold);
  }

  // Stair/transition tiles (8-11)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 8) * 16;
    drawStoneFloor(c, ox, 48, floorPal, 800 + i);
    // Draw steps
    for (let step = 0; step < 4; step++) {
      const sy = 48 + step * 4;
      c.hline(ox + step * 2, sy, 16 - step * 4, pal.highlight);
      c.hline(ox + step * 2, sy + 1, 16 - step * 4, pal.light);
    }
  }

  // Edge/border tiles (12-15)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 12) * 16;
    c.fillRect(ox, 48, 16, 16, pal.dark);
    // Decorative border
    c.hline(ox + 1, 49, 14, pal.accent || pal.highlight);
    c.hline(ox + 1, 62, 14, pal.accent || pal.highlight);
    c.vline(ox + 1, 49, 14, pal.accent || pal.highlight);
    c.vline(ox + 14, 49, 14, pal.accent || pal.highlight);
    // Inner pattern varies by theme
    if (theme === 'ruins') {
      // Ancient glyph pattern
      c.setPixel(ox + 5, 53, pal.accent); c.setPixel(ox + 6, 52, pal.accent);
      c.setPixel(ox + 7, 52, pal.accent); c.setPixel(ox + 8, 52, pal.accent);
      c.setPixel(ox + 9, 53, pal.accent); c.setPixel(ox + 7, 54, pal.accent);
      c.hline(ox + 5, 57, 6, pal.accent);
      c.vline(ox + 7, 57, 4, pal.accent);
    }
    if (theme === 'crystal') {
      // Crystal formation
      c.vline(ox + 7, 51, 8, PAL.manaViolet);
      c.vline(ox + 8, 53, 6, PAL.spellGlow);
      c.setPixel(ox + 6, 54, PAL.magicPurple);
      c.setPixel(ox + 9, 54, PAL.magicPurple);
    }
  }

  c.save(`${TILES}/${filename}`);
}

// ── Generate Ancient Ruins Tileset (standalone) ─────────────────────
function generateAncientRuinsTileset() {
  const c = new PixelCanvas(256, 64);
  const pal = THEMES.ruins;

  // Row 0: Core tiles - floor, walls with vine overgrowth
  // Floors (0-5) with ancient stone patterns
  for (let i = 0; i < 6; i++) {
    const ox = i * 16;
    c.fillRect(ox, 0, 16, 16, PAL.richEarth);
    // Weathered stone pattern
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = c.noise(x + ox, y, 1000 + i);
        if (n > 0.82) c.setPixel(ox + x, y, PAL.dirt);
        else if (n < 0.12) c.setPixel(ox + x, y, PAL.deepSoil);
      }
    }
    // Crumbled stone lines
    if (i % 2 === 0) {
      c.hline(ox + 1, 7, 14, PAL.deepSoil);
      c.vline(ox + 5, 0, 7, PAL.deepSoil);
      c.vline(ox + 11, 8, 8, PAL.deepSoil);
    }
    // Occasional moss
    if (i >= 3) {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (c.noise(ox + x, y, 1100 + i) > 0.9)
            c.setPixel(ox + x, y, PAL.deepForest);
        }
      }
    }
  }

  // Walls (6-9) - crumbling stone with vine accents
  for (let i = 0; i < 4; i++) {
    const ox = (i + 6) * 16;
    c.fillRect(ox, 0, 16, 16, PAL.dirt);
    // Large stone block pattern
    c.hline(ox, 0, 16, PAL.deepSoil);
    c.hline(ox, 5, 16, PAL.deepSoil);
    c.hline(ox, 10, 16, PAL.deepSoil);
    c.vline(ox, 0, 16, PAL.deepSoil);
    c.vline(ox + 8, 0, 5, PAL.deepSoil);
    c.vline(ox + 12, 5, 5, PAL.deepSoil);
    c.vline(ox + 4, 10, 6, PAL.deepSoil);
    // Weathering
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = c.noise(ox + x, y, 1200 + i * 7);
        if (n > 0.85) c.setPixel(ox + x, y, PAL.sand);
        else if (n < 0.1) c.setPixel(ox + x, y, PAL.deepSoil);
      }
    }
    // Vine growing down
    if (i >= 2) {
      const vx = ox + 3 + i * 2;
      for (let vy = 0; vy < 12; vy++) {
        const vn = c.noise(vx, vy, 1300 + i);
        c.setPixel(vx + (vn > 0.5 ? 1 : 0), vy, PAL.forestGreen);
        if (vn > 0.7) c.setPixel(vx + 1, vy, PAL.leafGreen);
      }
    }
  }

  // Pillar tiles (10-11)
  for (let i = 0; i < 2; i++) {
    const ox = (i + 10) * 16;
    c.fillRect(ox, 0, 16, 16, PAL.richEarth); // floor behind
    // Pillar body
    c.fillRect(ox + 4, 0, 8, 16, PAL.dirt);
    c.vline(ox + 4, 0, 16, PAL.sand);
    c.vline(ox + 11, 0, 16, PAL.deepSoil);
    // Capital detail
    c.fillRect(ox + 3, 0, 10, 3, PAL.sand);
    c.hline(ox + 3, 0, 10, PAL.desertGold);
    // Cracks
    if (i === 1) {
      c.setPixel(ox + 6, 5, PAL.deepSoil);
      c.setPixel(ox + 7, 6, PAL.deepSoil);
      c.setPixel(ox + 7, 7, PAL.deepSoil);
      c.setPixel(ox + 8, 8, PAL.deepSoil);
    }
  }

  // Ancient glyph tiles (12-13)
  for (let i = 0; i < 2; i++) {
    const ox = (i + 12) * 16;
    c.fillRect(ox, 0, 16, 16, PAL.richEarth);
    // Border
    c.hline(ox + 1, 1, 14, PAL.sand);
    c.hline(ox + 1, 14, 14, PAL.sand);
    c.vline(ox + 1, 1, 14, PAL.sand);
    c.vline(ox + 14, 1, 14, PAL.sand);
    // Glyph (simple rune pattern)
    const gx = ox + 4;
    if (i === 0) {
      // Circle with cross
      c.hline(gx + 1, 4, 6, PAL.desertGold);
      c.hline(gx + 1, 11, 6, PAL.desertGold);
      c.vline(gx, 5, 6, PAL.desertGold);
      c.vline(gx + 7, 5, 6, PAL.desertGold);
      c.hline(gx + 1, 7, 6, PAL.darkGold);
      c.vline(gx + 3, 5, 6, PAL.darkGold);
    } else {
      // Arrow/chevron glyph
      c.setPixel(gx + 3, 4, PAL.desertGold);
      c.setPixel(gx + 2, 5, PAL.desertGold); c.setPixel(gx + 4, 5, PAL.desertGold);
      c.setPixel(gx + 1, 6, PAL.desertGold); c.setPixel(gx + 5, 6, PAL.desertGold);
      c.setPixel(gx, 7, PAL.desertGold); c.setPixel(gx + 6, 7, PAL.desertGold);
      c.vline(gx + 3, 7, 5, PAL.desertGold);
    }
  }

  // Trap floor tiles (14-15)
  for (let i = 0; i < 2; i++) {
    const ox = (i + 14) * 16;
    c.fillRect(ox, 0, 16, 16, PAL.richEarth);
    // Suspicious crack lines
    c.hline(ox + 2, 2, 12, PAL.deepSoil);
    c.hline(ox + 2, 13, 12, PAL.deepSoil);
    c.vline(ox + 2, 2, 12, PAL.deepSoil);
    c.vline(ox + 13, 2, 12, PAL.deepSoil);
    // Warning indicator
    if (i === 1) {
      c.setPixel(ox + 7, 7, PAL.brightRed);
      c.setPixel(ox + 8, 7, PAL.brightRed);
      c.setPixel(ox + 7, 8, PAL.brightRed);
      c.setPixel(ox + 8, 8, PAL.brightRed);
    }
  }

  // Row 1 (y=16): Auto-tile walls - top, bottom, left, right, corners
  // Walls with direction (0-3: T,B,L,R)
  const sides = ['top', 'bottom', 'left', 'right'];
  for (let i = 0; i < 4; i++) {
    const ox = i * 16;
    c.fillRect(ox, 16, 16, 16, PAL.dirt);
    // Large block pattern
    for (let row = 0; row < 3; row++) {
      c.hline(ox, 16 + row * 5, 16, PAL.deepSoil);
      c.vline(ox + (row % 2 === 0 ? 7 : 11), 16 + row * 5, 5, PAL.deepSoil);
    }
    // Side highlight
    if (sides[i] === 'top') c.hline(ox, 16, 16, PAL.sand);
    if (sides[i] === 'bottom') c.hline(ox, 31, 16, PAL.sand);
    if (sides[i] === 'left') c.vline(ox, 16, 16, PAL.sand);
    if (sides[i] === 'right') c.vline(ox + 15, 16, 16, PAL.sand);
  }

  // Outer corners (4-7: TL,TR,BL,BR)
  const cornerTypes = ['tl', 'tr', 'bl', 'br'];
  for (let i = 0; i < 4; i++) {
    const ox = (i + 4) * 16;
    c.fillRect(ox, 16, 16, 16, PAL.dirt);
    for (let row = 0; row < 3; row++) {
      c.hline(ox, 16 + row * 5, 16, PAL.deepSoil);
    }
    const ct = cornerTypes[i];
    if (ct.includes('t')) c.hline(ox, 16, 16, PAL.sand);
    if (ct.includes('b')) c.hline(ox, 31, 16, PAL.sand);
    if (ct.includes('l')) c.vline(ox, 16, 16, PAL.sand);
    if (ct === 'tr' || ct === 'br') c.vline(ox + 15, 16, 16, PAL.sand);
  }

  // Inner corners (8-11)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 8) * 16;
    c.fillRect(ox, 16, 16, 16, PAL.dirt);
    for (let row = 0; row < 3; row++) c.hline(ox, 16 + row * 5, 16, PAL.deepSoil);
    // Floor patch in corner
    const ct = cornerTypes[i];
    const fx = ct.includes('r') ? ox : ox + 8;
    const fy = ct.includes('b') ? 16 : 24;
    c.fillRect(fx, fy, 8, 8, PAL.richEarth);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (c.noise(fx + x, fy + y, 1400 + i) > 0.85) c.setPixel(fx + x, fy + y, PAL.dirt);
      }
    }
  }

  // Crumbled wall variants (12-15)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 12) * 16;
    c.fillRect(ox, 16, 16, 16, PAL.dirt);
    for (let row = 0; row < 3; row++) c.hline(ox, 16 + row * 5, 16, PAL.deepSoil);
    // Missing chunks
    const chunks = 2 + i;
    for (let j = 0; j < chunks; j++) {
      const cx = ox + Math.floor(c.noise(i, j, 1500) * 12) + 2;
      const cy = 18 + Math.floor(c.noise(j, i, 1501) * 10);
      c.fillRect(cx, cy, 3, 3, PAL.richEarth);
    }
    // Vine accent
    const vx = ox + 2 + i * 3;
    for (let vy = 16; vy < 28; vy++) {
      if (c.noise(vx, vy, 1600 + i) > 0.4) {
        c.setPixel(vx, vy, PAL.forestGreen);
      }
    }
  }

  // Row 2 (y=32): Decorative ruins tiles
  // Broken floor with ancient patterns
  for (let i = 0; i < 16; i++) {
    const ox = i * 16;
    c.fillRect(ox, 32, 16, 16, PAL.richEarth);
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const n = c.noise(ox + x, 32 + y, 1700 + i * 11);
        if (n > 0.83) c.setPixel(ox + x, 32 + y, PAL.dirt);
        else if (n < 0.1) c.setPixel(ox + x, 32 + y, PAL.deepSoil);
      }
    }
    // Different decorative elements per tile
    if (i < 4) {
      // Mosaic floor pieces
      c.fillRect(ox + 3, 35, 4, 4, PAL.desertGold);
      c.fillRect(ox + 9, 39, 4, 4, PAL.darkGold);
    } else if (i < 8) {
      // Overgrown floor
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (c.noise(ox + x, 32 + y, 1800 + i) > 0.82)
            c.setPixel(ox + x, 32 + y, PAL.forestGreen);
          if (c.noise(ox + x, 32 + y, 1900 + i) > 0.92)
            c.setPixel(ox + x, 32 + y, PAL.leafGreen);
        }
      }
    } else if (i < 12) {
      // Cracked with rubble
      c.setPixel(ox + 5, 36, PAL.deepSoil); c.setPixel(ox + 6, 37, PAL.deepSoil);
      c.setPixel(ox + 7, 38, PAL.deepSoil); c.setPixel(ox + 8, 37, PAL.deepSoil);
      c.setPixel(ox + 10, 40, PAL.sand); c.setPixel(ox + 11, 40, PAL.sand);
    } else {
      // Ancient tile pattern
      for (let y = 0; y < 16; y += 4) {
        c.hline(ox, 32 + y, 16, PAL.sand);
      }
      for (let x = 0; x < 16; x += 4) {
        c.vline(ox + x, 32, 16, PAL.sand);
      }
    }
  }

  // Row 3 (y=48): Special tiles - void, stairs, water puddles, treasure alcoves
  for (let i = 0; i < 4; i++) drawVoidTile(c, i * 16, 48);

  // Stairs down (4-5)
  for (let i = 0; i < 2; i++) {
    const ox = (i + 4) * 16;
    c.fillRect(ox, 48, 16, 16, PAL.deepSoil);
    for (let step = 0; step < 5; step++) {
      const sw = 16 - step * 2;
      const sx = ox + step;
      c.hline(sx, 48 + step * 3, sw, PAL.sand);
      c.fillRect(sx, 49 + step * 3, sw, 2, PAL.dirt);
    }
  }

  // Water puddle tiles (6-7)
  for (let i = 0; i < 2; i++) {
    const ox = (i + 6) * 16;
    c.fillRect(ox, 48, 16, 16, PAL.richEarth);
    // Water pool
    for (let y = 3; y < 13; y++) {
      for (let x = 3; x < 13; x++) {
        const dist = Math.sqrt((x - 8) * (x - 8) + (y - 8) * (y - 8));
        if (dist < 5) {
          const n = c.noise(ox + x, 48 + y, 2000 + i);
          c.setPixel(ox + x, 48 + y, n > 0.5 ? PAL.oceanBlue : PAL.deepOcean);
        }
      }
    }
  }

  // Treasure alcove tiles (8-11)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 8) * 16;
    c.fillRect(ox, 48, 16, 16, PAL.richEarth);
    // Alcove indent
    c.fillRect(ox + 2, 48, 12, 14, PAL.deepSoil);
    c.hline(ox + 2, 48, 12, PAL.sand);
    c.vline(ox + 2, 48, 14, PAL.sand);
    c.vline(ox + 13, 48, 14, PAL.sand);
    // Gold accent
    c.setPixel(ox + 7, 50, PAL.gold);
    c.setPixel(ox + 8, 50, PAL.gold);
  }

  // Archway tiles (12-15)
  for (let i = 0; i < 4; i++) {
    const ox = (i + 12) * 16;
    c.fillRect(ox, 48, 16, 16, PAL.richEarth);
    // Arch columns
    c.fillRect(ox + 1, 48, 3, 16, PAL.dirt);
    c.fillRect(ox + 12, 48, 3, 16, PAL.dirt);
    // Arch top
    c.hline(ox + 4, 48, 8, PAL.sand);
    c.hline(ox + 3, 49, 10, PAL.sand);
    // Keystone
    c.setPixel(ox + 7, 48, PAL.desertGold);
    c.setPixel(ox + 8, 48, PAL.desertGold);
    // Column highlights
    c.vline(ox + 1, 48, 16, PAL.sand);
    c.vline(ox + 14, 48, 16, PAL.sand);
  }

  c.save(`${TILES}/tileset_dungeon_ancient_ruins.png`);
}

// ── Decoration Sprites ──────────────────────────────────────────────

function generateTorchSprite() {
  // 64x16: 4 animation frames at 16x16
  const c = new PixelCanvas(64, 16);
  const flames = [
    // Frame 0: small flame
    [[7, 3], [8, 3], [7, 2], [8, 2], [7, 1]],
    // Frame 1: medium flame left
    [[7, 3], [8, 3], [6, 2], [7, 2], [8, 2], [7, 1], [6, 0]],
    // Frame 2: large flame
    [[7, 3], [8, 3], [7, 2], [8, 2], [6, 1], [7, 1], [8, 1], [9, 1], [7, 0], [8, 0]],
    // Frame 3: medium flame right
    [[7, 3], [8, 3], [7, 2], [8, 2], [9, 2], [8, 1], [9, 0]],
  ];

  for (let f = 0; f < 4; f++) {
    const ox = f * 16;
    // Torch body (wooden handle)
    c.fillRect(ox + 7, 6, 2, 10, PAL.richEarth);
    c.setPixel(ox + 7, 6, PAL.dirt);
    c.setPixel(ox + 8, 6, PAL.dirt);
    // Torch head (metal cup)
    c.fillRect(ox + 6, 4, 4, 2, PAL.stoneGray);
    c.setPixel(ox + 6, 4, PAL.midGray);
    c.setPixel(ox + 9, 4, PAL.midGray);
    // Flame
    flames[f].forEach(([x, y]) => {
      const brightness = y <= 1 ? PAL.brightYellow : (y === 2 ? PAL.fireOrange : PAL.brightRed);
      c.setPixel(ox + x, y, brightness);
    });
    // Glow
    c.setPixel(ox + 6, 3, [...PAL.fireOrange, 128]);
    c.setPixel(ox + 9, 3, [...PAL.fireOrange, 128]);
  }

  c.save(`${SPRITES}/sprite_dun_decor_torch.png`);
}

function generateAltarSprite() {
  // 32x16: altar (double-wide for a 32x16 altar)
  const c = new PixelCanvas(32, 16);

  // Base platform
  c.fillRect(2, 12, 28, 4, PAL.stoneGray);
  c.hline(2, 12, 28, PAL.lightStone);
  c.hline(2, 15, 28, PAL.darkRock);

  // Altar body
  c.fillRect(6, 6, 20, 6, PAL.midGray);
  c.hline(6, 6, 20, PAL.lightStone);
  c.vline(6, 6, 6, PAL.lightStone);
  c.vline(25, 6, 6, PAL.darkRock);
  c.hline(6, 11, 20, PAL.darkRock);

  // Top surface
  c.fillRect(4, 4, 24, 2, PAL.lightStone);
  c.hline(4, 4, 24, PAL.paleGray);

  // Magical glow in center
  c.setPixel(15, 5, PAL.manaViolet);
  c.setPixel(16, 5, PAL.manaViolet);
  c.setPixel(14, 4, PAL.spellGlow);
  c.setPixel(15, 3, PAL.spellGlow);
  c.setPixel(16, 3, PAL.spellGlow);
  c.setPixel(17, 4, PAL.spellGlow);

  // Side engravings
  c.setPixel(9, 8, PAL.gold);
  c.setPixel(10, 8, PAL.gold);
  c.setPixel(21, 8, PAL.gold);
  c.setPixel(22, 8, PAL.gold);
  c.setPixel(9, 9, PAL.darkGold);
  c.setPixel(22, 9, PAL.darkGold);

  c.save(`${SPRITES}/sprite_dun_decor_altar.png`);
}

function generatePillarSprite() {
  // 16x24: tall stone pillar
  const c = new PixelCanvas(16, 24);

  // Base
  c.fillRect(3, 20, 10, 4, PAL.stoneGray);
  c.hline(3, 20, 10, PAL.lightStone);
  c.hline(3, 23, 10, PAL.darkRock);
  c.vline(3, 20, 4, PAL.lightStone);
  c.vline(12, 20, 4, PAL.darkRock);

  // Shaft
  c.fillRect(5, 4, 6, 16, PAL.midGray);
  c.vline(5, 4, 16, PAL.lightStone);
  c.vline(10, 4, 16, PAL.darkRock);

  // Capital (top)
  c.fillRect(3, 0, 10, 4, PAL.lightStone);
  c.hline(3, 0, 10, PAL.paleGray);
  c.hline(3, 3, 10, PAL.stoneGray);
  c.vline(3, 0, 4, PAL.paleGray);
  c.vline(12, 0, 4, PAL.stoneGray);

  // Decorative ring
  c.fillRect(4, 2, 8, 1, PAL.gold);

  // Crack detail
  c.setPixel(7, 10, PAL.darkRock);
  c.setPixel(7, 11, PAL.darkRock);
  c.setPixel(8, 12, PAL.darkRock);

  c.save(`${SPRITES}/sprite_dun_decor_pillar.png`);
}

function generateRubbleSprite() {
  // 32x16: 2 rubble variants at 16x16
  const c = new PixelCanvas(32, 16);

  for (let v = 0; v < 2; v++) {
    const ox = v * 16;
    // Scattered stone chunks
    const chunks = [
      [3, 10, 4, 3], [8, 8, 3, 5], [12, 11, 3, 2],
      [2, 13, 5, 2], [9, 13, 4, 2], [6, 11, 3, 2],
    ];
    chunks.forEach(([x, y, w, h], i) => {
      const color = c.noise(x, y, 2100 + v * 10 + i) > 0.5 ? PAL.stoneGray : PAL.midGray;
      c.fillRect(ox + x + (v * 2), y, w, h, color);
      c.setPixel(ox + x + (v * 2), y, PAL.lightStone);
    });
    // Dust particles
    for (let i = 0; i < 4; i++) {
      const dx = ox + Math.floor(c.noise(v, i, 2200) * 14) + 1;
      const dy = Math.floor(c.noise(i, v, 2201) * 6) + 10;
      c.setPixel(dx, dy, PAL.darkRock);
    }
  }

  c.save(`${SPRITES}/sprite_dun_decor_rubble.png`);
}

function generateBarrelSprite() {
  // 16x16: wooden barrel
  const c = new PixelCanvas(16, 16);

  // Barrel body (oval shape)
  c.fillRect(4, 2, 8, 12, PAL.richEarth);
  c.fillRect(3, 4, 10, 8, PAL.richEarth);

  // Wood grain lines
  c.vline(5, 3, 10, PAL.deepSoil);
  c.vline(7, 2, 12, PAL.deepSoil);
  c.vline(9, 2, 12, PAL.deepSoil);
  c.vline(11, 3, 10, PAL.deepSoil);

  // Metal bands
  c.hline(3, 4, 10, PAL.stoneGray);
  c.hline(3, 11, 10, PAL.stoneGray);
  c.hline(4, 7, 8, PAL.midGray);

  // Highlights
  c.setPixel(5, 5, PAL.dirt);
  c.setPixel(6, 5, PAL.dirt);

  // Lid
  c.hline(5, 2, 6, PAL.dirt);
  c.hline(4, 13, 8, PAL.deepSoil);

  // Shadow
  c.hline(4, 14, 8, PAL.darkRock);

  c.save(`${SPRITES}/sprite_dun_decor_barrel.png`);
}

function generateBonesSprite() {
  // 16x16: bone pile
  const c = new PixelCanvas(16, 16);

  // Bones
  const boneColor = PAL.paleGray;
  const boneShadow = PAL.lightStone;

  // Skull
  c.fillRect(6, 4, 5, 4, boneColor);
  c.setPixel(7, 5, PAL.shadowBlack); // eye
  c.setPixel(9, 5, PAL.shadowBlack); // eye
  c.setPixel(8, 7, PAL.darkRock); // jaw

  // Crossed bones
  // Bone 1 (diagonal left-to-right)
  c.setPixel(2, 8, boneShadow); c.setPixel(3, 9, boneColor);
  c.setPixel(4, 10, boneColor); c.setPixel(5, 11, boneColor);
  c.setPixel(6, 12, boneColor); c.setPixel(7, 13, boneShadow);
  // Bone 2 (diagonal right-to-left)
  c.setPixel(12, 8, boneShadow); c.setPixel(11, 9, boneColor);
  c.setPixel(10, 10, boneColor); c.setPixel(9, 11, boneColor);
  c.setPixel(8, 12, boneColor); c.setPixel(7, 13, boneShadow);

  // Scattered small bones
  c.hline(2, 14, 3, boneShadow);
  c.hline(10, 13, 4, boneShadow);
  c.setPixel(13, 14, boneColor);

  c.save(`${SPRITES}/sprite_dun_decor_bones.png`);
}

function generateCrystalDecor() {
  // 16x16: crystal formation decoration
  const c = new PixelCanvas(16, 16);

  // Large crystal (center)
  c.vline(7, 2, 10, PAL.manaViolet);
  c.vline(8, 1, 11, PAL.magicPurple);
  c.vline(9, 3, 9, PAL.manaViolet);
  c.setPixel(8, 0, PAL.spellGlow);
  c.setPixel(7, 2, PAL.spellGlow);
  c.setPixel(9, 3, PAL.spellGlow);

  // Small crystal (left)
  c.vline(4, 6, 6, PAL.magicPurple);
  c.vline(5, 5, 7, PAL.manaViolet);
  c.setPixel(5, 4, PAL.spellGlow);

  // Small crystal (right)
  c.vline(11, 7, 5, PAL.magicPurple);
  c.vline(12, 6, 6, PAL.manaViolet);
  c.setPixel(12, 5, PAL.spellGlow);

  // Base rocks
  c.fillRect(3, 12, 11, 4, PAL.darkRock);
  for (let x = 3; x < 14; x++) {
    if (c.noise(x, 12, 2300) > 0.6) c.setPixel(x, 12, PAL.stoneGray);
  }

  // Glow particles
  c.setPixel(6, 3, [...PAL.spellGlow, 180]);
  c.setPixel(10, 5, [...PAL.spellGlow, 180]);

  c.save(`${SPRITES}/sprite_dun_decor_crystal.png`);
}

// ── Portal Sprites ──────────────────────────────────────────────────

function generatePortal(filename, portalColor, accentColor, glowColor) {
  // 128x32: 4 animation frames at 32x32
  const c = new PixelCanvas(128, 32);

  for (let f = 0; f < 4; f++) {
    const ox = f * 32;
    // Stone frame
    c.fillRect(ox + 4, 2, 24, 28, PAL.darkRock);
    c.fillRect(ox + 6, 4, 20, 24, PAL.shadowBlack);

    // Frame details
    c.vline(ox + 4, 2, 28, PAL.stoneGray);
    c.vline(ox + 27, 2, 28, PAL.stoneGray);
    c.hline(ox + 4, 2, 24, PAL.lightStone);
    c.hline(ox + 4, 29, 24, PAL.darkRock);

    // Keystone at top
    c.fillRect(ox + 13, 1, 6, 3, PAL.stoneGray);
    c.setPixel(ox + 15, 1, glowColor);
    c.setPixel(ox + 16, 1, glowColor);

    // Portal energy (inner glow - animated)
    const phase = f * 0.25;
    for (let y = 5; y < 27; y++) {
      for (let x = 7; x < 25; x++) {
        const cx = x - 16;
        const cy = y - 16;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const n = c.noise(x + f * 7, y + f * 3, 2400 + f);

        if (dist < 9) {
          if (dist < 4 && n > 0.3) {
            c.setPixel(ox + x, y, glowColor);
          } else if (dist < 6 && n > 0.2) {
            c.setPixel(ox + x, y, accentColor);
          } else if (dist < 9 && n > 0.15) {
            c.setPixel(ox + x, y, portalColor);
          }
        }
      }
    }

    // Swirl effect (varies per frame)
    const angles = [0, 1.57, 3.14, 4.71];
    for (let a = 0; a < 8; a++) {
      const angle = angles[f % 4] + a * 0.785;
      const r = 3 + a * 0.5;
      const sx = ox + 16 + Math.round(Math.cos(angle) * r);
      const sy = 16 + Math.round(Math.sin(angle) * r);
      c.setPixel(sx, sy, glowColor);
    }

    // Column decorations
    c.setPixel(ox + 5, 8, PAL.gold);
    c.setPixel(ox + 26, 8, PAL.gold);
    c.setPixel(ox + 5, 22, PAL.gold);
    c.setPixel(ox + 26, 22, PAL.gold);
  }

  c.save(`${SPRITES}/${filename}`);
}

// ── Boss Room Environment ───────────────────────────────────────────

function generateBossArenaFloor() {
  // 64x64: 4x4 tile boss room center piece
  const c = new PixelCanvas(64, 64);

  // Dark stone base
  for (let ty = 0; ty < 4; ty++) {
    for (let tx = 0; tx < 4; tx++) {
      const ox = tx * 16;
      const oy = ty * 16;
      c.fillRect(ox, oy, 16, 16, PAL.darkRock);
      // Stone texture
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const n = c.noise(ox + x, oy + y, 3000);
          if (n > 0.85) c.setPixel(ox + x, oy + y, PAL.stoneGray);
          else if (n < 0.1) c.setPixel(ox + x, oy + y, PAL.shadowBlack);
        }
      }
    }
  }

  // Circular arena pattern
  const center = 32;
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outer ring
      if (dist > 28 && dist < 30) {
        c.setPixel(x, y, PAL.gold);
      }
      // Inner ring
      if (dist > 18 && dist < 20) {
        c.setPixel(x, y, PAL.darkGold);
      }
      // Center circle
      if (dist > 8 && dist < 10) {
        c.setPixel(x, y, PAL.brightRed);
      }
      // Center glow
      if (dist < 5) {
        c.setPixel(x, y, c.noise(x, y, 3100) > 0.5 ? PAL.enemyRed : PAL.deepBlood);
      }
    }
  }

  // Cardinal lines connecting rings
  for (let i = 20; i < 28; i++) {
    c.setPixel(center, center - i, PAL.darkGold);
    c.setPixel(center, center + i, PAL.darkGold);
    c.setPixel(center - i, center, PAL.darkGold);
    c.setPixel(center + i, center, PAL.darkGold);
  }

  // Rune symbols at cardinal points
  const runePositions = [[center, 4], [center, 58], [4, center], [58, center]];
  runePositions.forEach(([rx, ry]) => {
    c.setPixel(rx, ry, PAL.brightRed);
    c.setPixel(rx - 1, ry, PAL.enemyRed);
    c.setPixel(rx + 1, ry, PAL.enemyRed);
    c.setPixel(rx, ry - 1, PAL.enemyRed);
    c.setPixel(rx, ry + 1, PAL.enemyRed);
  });

  c.save(`${SPRITES}/sprite_dun_boss_arena_floor.png`);
}

function generateBossPillar() {
  // 16x32: tall boss room pillar
  const c = new PixelCanvas(16, 32);

  // Base
  c.fillRect(2, 26, 12, 6, PAL.stoneGray);
  c.hline(2, 26, 12, PAL.lightStone);
  c.hline(2, 31, 12, PAL.darkRock);
  c.vline(2, 26, 6, PAL.lightStone);
  c.vline(13, 26, 6, PAL.darkRock);

  // Shaft
  c.fillRect(4, 6, 8, 20, PAL.midGray);
  c.vline(4, 6, 20, PAL.lightStone);
  c.vline(11, 6, 20, PAL.darkRock);

  // Capital
  c.fillRect(2, 0, 12, 6, PAL.lightStone);
  c.hline(2, 0, 12, PAL.paleGray);
  c.hline(2, 5, 12, PAL.stoneGray);

  // Decorative bands
  c.hline(4, 8, 8, PAL.gold);
  c.hline(4, 24, 8, PAL.gold);

  // Red gem inset
  c.setPixel(7, 3, PAL.brightRed);
  c.setPixel(8, 3, PAL.brightRed);
  c.setPixel(7, 2, PAL.enemyRed);
  c.setPixel(8, 2, PAL.enemyRed);

  // Skull carving
  c.fillRect(6, 14, 4, 3, PAL.paleGray);
  c.setPixel(6, 14, PAL.shadowBlack);
  c.setPixel(9, 14, PAL.shadowBlack);
  c.setPixel(7, 16, PAL.darkRock);
  c.setPixel(8, 16, PAL.darkRock);

  // Chain hooks
  c.setPixel(3, 7, PAL.stoneGray);
  c.setPixel(12, 7, PAL.stoneGray);

  c.save(`${SPRITES}/sprite_dun_boss_pillar.png`);
}

function generateBossThrone() {
  // 32x32: boss throne
  const c = new PixelCanvas(32, 32);

  // Back of throne (tall)
  c.fillRect(6, 2, 20, 8, PAL.darkRock);
  c.fillRect(8, 0, 16, 2, PAL.stoneGray);

  // Spire finials
  c.fillRect(7, 0, 2, 4, PAL.stoneGray);
  c.fillRect(23, 0, 2, 4, PAL.stoneGray);
  c.setPixel(7, 0, PAL.brightRed);
  c.setPixel(24, 0, PAL.brightRed);

  // Throne backrest
  c.fillRect(8, 4, 16, 10, PAL.midGray);
  c.vline(8, 4, 10, PAL.lightStone);
  c.vline(23, 4, 10, PAL.darkRock);

  // Seat
  c.fillRect(6, 14, 20, 6, PAL.stoneGray);
  c.hline(6, 14, 20, PAL.lightStone);
  c.fillRect(8, 14, 16, 4, PAL.midGray);

  // Armrests
  c.fillRect(4, 10, 4, 10, PAL.stoneGray);
  c.fillRect(24, 10, 4, 10, PAL.stoneGray);
  c.hline(4, 10, 4, PAL.lightStone);
  c.hline(24, 10, 4, PAL.lightStone);

  // Front legs
  c.fillRect(6, 20, 4, 12, PAL.darkRock);
  c.fillRect(22, 20, 4, 12, PAL.darkRock);
  c.vline(6, 20, 12, PAL.stoneGray);
  c.vline(25, 20, 12, PAL.darkRock);

  // Skull decoration on backrest
  c.fillRect(13, 6, 6, 4, PAL.paleGray);
  c.setPixel(14, 7, PAL.shadowBlack);
  c.setPixel(17, 7, PAL.shadowBlack);
  c.hline(14, 9, 4, PAL.darkRock);

  // Red gem on top
  c.fillRect(14, 1, 4, 2, PAL.brightRed);
  c.setPixel(14, 1, PAL.enemyRed);
  c.setPixel(17, 1, PAL.enemyRed);
  c.setPixel(15, 0, PAL.ember);

  // Gold trim
  c.hline(8, 13, 16, PAL.gold);
  c.hline(4, 19, 4, PAL.darkGold);
  c.hline(24, 19, 4, PAL.darkGold);

  c.save(`${SPRITES}/sprite_dun_boss_throne.png`);
}

function generateBossChains() {
  // 16x32: hanging chains
  const c = new PixelCanvas(16, 32);

  // Chain links pattern (two chains)
  for (let chain = 0; chain < 2; chain++) {
    const cx = chain === 0 ? 4 : 11;
    for (let i = 0; i < 16; i++) {
      const y = i * 2;
      const isHoriz = i % 2 === 0;
      if (isHoriz) {
        c.setPixel(cx - 1, y, PAL.stoneGray);
        c.setPixel(cx, y, PAL.lightStone);
        c.setPixel(cx + 1, y, PAL.stoneGray);
      } else {
        c.setPixel(cx, y, PAL.midGray);
        c.setPixel(cx, y + 1, PAL.midGray);
      }
    }
  }

  // Mount plate at top
  c.fillRect(2, 0, 12, 2, PAL.stoneGray);
  c.hline(2, 0, 12, PAL.lightStone);

  // Weight/hook at bottom
  c.fillRect(3, 28, 3, 4, PAL.midGray);
  c.fillRect(10, 28, 3, 4, PAL.midGray);
  c.setPixel(4, 31, PAL.darkRock);
  c.setPixel(11, 31, PAL.darkRock);

  c.save(`${SPRITES}/sprite_dun_boss_chains.png`);
}

// ── Minimap Tile Icons ──────────────────────────────────────────────

function generateMinimapIcons() {
  const icons = {
    'icon_minimap_floor':    (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); },
    'icon_minimap_wall':     (c) => { c.fillRect(0, 0, 8, 8, PAL.stoneGray); c.hline(0, 0, 8, PAL.lightStone); },
    'icon_minimap_door':     (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.fillRect(2, 1, 4, 6, PAL.richEarth); c.hline(2, 1, 4, PAL.dirt); },
    'icon_minimap_chest':    (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.fillRect(2, 3, 4, 3, PAL.gold); c.setPixel(3, 4, PAL.darkGold); },
    'icon_minimap_boss':     (c) => { c.fillRect(0, 0, 8, 8, PAL.deepBlood); c.fillRect(2, 2, 4, 4, PAL.brightRed); c.setPixel(3, 3, PAL.nearWhite); },
    'icon_minimap_entrance': (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.fillRect(2, 1, 4, 6, PAL.forestGreen); c.setPixel(3, 3, PAL.brightGrass); c.setPixel(4, 3, PAL.brightGrass); },
    'icon_minimap_exit':     (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.fillRect(2, 1, 4, 6, PAL.skyBlue); c.setPixel(3, 3, PAL.iceBlue); c.setPixel(4, 3, PAL.iceBlue); },
    'icon_minimap_trap':     (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.setPixel(3, 3, PAL.brightRed); c.setPixel(4, 3, PAL.brightRed); c.setPixel(3, 4, PAL.brightRed); c.setPixel(4, 4, PAL.brightRed); c.setPixel(2, 2, PAL.fireOrange); c.setPixel(5, 5, PAL.fireOrange); },
    'icon_minimap_player':   (c) => { c.fillRect(0, 0, 8, 8, [0,0,0,0]); c.fillRect(2, 2, 4, 4, PAL.playerBlue); c.setPixel(3, 2, PAL.shimmer); c.setPixel(4, 2, PAL.shimmer); },
    'icon_minimap_altar':    (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.fillRect(2, 3, 4, 2, PAL.manaViolet); c.setPixel(3, 2, PAL.spellGlow); c.setPixel(4, 2, PAL.spellGlow); },
    'icon_minimap_stairs':   (c) => { c.fillRect(0, 0, 8, 8, PAL.darkRock); c.hline(1, 2, 6, PAL.lightStone); c.hline(2, 4, 4, PAL.lightStone); c.hline(3, 6, 2, PAL.lightStone); },
  };

  // Ensure minimap icon directory exists
  const iconDir = `${UI}/minimap`;
  if (!fs.existsSync(iconDir)) fs.mkdirSync(iconDir, { recursive: true });

  for (const [name, drawFn] of Object.entries(icons)) {
    const c = new PixelCanvas(8, 8);
    drawFn(c);
    c.save(`${iconDir}/${name}.png`);
  }
}

// ── Main Generation ─────────────────────────────────────────────────
console.log('\n=== PIX-397: Dungeon Art Asset Generator ===\n');

console.log('1. Procedural auto-tile tilesets:');
generateProcTileset('stone', 'tileset_dungeon_proc_stone.png');
generateProcTileset('crystal', 'tileset_dungeon_proc_crystal.png');
generateProcTileset('lava', 'tileset_dungeon_proc_lava.png');
generateProcTileset('ruins', 'tileset_dungeon_proc_ruins.png');

console.log('\n2. Ancient ruins tileset:');
generateAncientRuinsTileset();

console.log('\n3. Room decoration sprites:');
generateTorchSprite();
generateAltarSprite();
generatePillarSprite();
generateRubbleSprite();
generateBarrelSprite();
generateBonesSprite();
generateCrystalDecor();

console.log('\n4. Dungeon portal variants:');
generatePortal('sprite_dun_portal_entrance.png', PAL.forestGreen, PAL.leafGreen, PAL.brightGrass);
generatePortal('sprite_dun_portal_exit.png', PAL.magicPurple, PAL.manaViolet, PAL.spellGlow);

console.log('\n5. Boss room environment:');
generateBossArenaFloor();
generateBossPillar();
generateBossThrone();
generateBossChains();

console.log('\n6. Minimap tile icons:');
generateMinimapIcons();

console.log('\n=== Generation complete! ===\n');
