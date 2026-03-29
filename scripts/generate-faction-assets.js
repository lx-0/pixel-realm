#!/usr/bin/env node
/**
 * Generate faction & reputation art assets for PixelRealm.
 * Uses only the 32-color master palette from palette-swatches.svg.
 * All assets are pixel art PNGs at 1:1 game resolution (Phaser scales ×3 at runtime).
 *
 * NO EXTERNAL DEPENDENCIES — uses raw PNG encoding with Node.js built-in zlib.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Raw PNG encoder (no dependencies) ───────────────────────────────────────

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

function encodePNG(width, height, rgba) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw image data with filter byte (0 = None) per row
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0; // filter: None
    rgba.copy(raw, y * rowLen + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Master Palette (32 colors) ──────────────────────────────────────────────
const P = {
  black:      [0x0d, 0x0d, 0x0d],
  darkGray:   [0x2b, 0x2b, 0x2b],
  midGray:    [0x4a, 0x4a, 0x4a],
  gray:       [0x6e, 0x6e, 0x6e],
  lightGray:  [0x96, 0x96, 0x96],
  silver:     [0xc8, 0xc8, 0xc8],
  white:      [0xf0, 0xf0, 0xf0],
  darkBrown:  [0x3b, 0x20, 0x10],
  brown:      [0x6b, 0x3a, 0x1f],
  midBrown:   [0x8b, 0x5c, 0x2a],
  tan:        [0xb8, 0x84, 0x3f],
  sand:       [0xd4, 0xa8, 0x5a],
  cream:      [0xe8, 0xd0, 0x8a],
  darkGreen:  [0x1a, 0x3a, 0x1a],
  green:      [0x2d, 0x6e, 0x2d],
  midGreen:   [0x4c, 0x9b, 0x4c],
  lightGreen: [0x78, 0xc8, 0x78],
  paleGreen:  [0xa8, 0xe4, 0xa0],
  darkNavy:   [0x0a, 0x1a, 0x3a],
  navy:       [0x1a, 0x4a, 0x8a],
  blue:       [0x2a, 0x7a, 0xc0],
  cyan:       [0x50, 0xa8, 0xe8],
  lightCyan:  [0x90, 0xd0, 0xf8],
  paleCyan:   [0xc8, 0xf0, 0xff],
  darkRed:    [0x5a, 0x0a, 0x0a],
  red:        [0xa0, 0x10, 0x10],
  brightRed:  [0xd4, 0x20, 0x20],
  orange:     [0xf0, 0x60, 0x20],
  lightOrange:[0xf8, 0xa0, 0x60],
  darkGold:   [0xa8, 0x70, 0x00],
  gold:       [0xe8, 0xb8, 0x00],
  yellow:     [0xff, 0xe0, 0x40],
  paleYellow: [0xff, 0xf8, 0xa0],
  darkPurple: [0x1a, 0x0a, 0x3a],
  purple:     [0x5a, 0x20, 0xa0],
  midPurple:  [0x90, 0x50, 0xe0],
  lightPurple:[0xd0, 0x90, 0xff],
};

// ── Faction color schemes ───────────────────────────────────────────────────
const FACTIONS = {
  arcane: {
    name: 'Arcane Council', key: 'mages',
    primary: P.midPurple, secondary: P.lightPurple, dark: P.darkPurple, accent: P.purple,
  },
  shadow: {
    name: 'Shadow Guild', key: 'shadow',
    primary: P.brightRed, secondary: P.orange, dark: P.darkRed, accent: P.red,
  },
  rangers: {
    name: 'Frontier Rangers', key: 'nature',
    primary: P.midGreen, secondary: P.lightGreen, dark: P.darkGreen, accent: P.green,
  },
  artisans: {
    name: 'Artisan Collective', key: 'merchants',
    primary: P.gold, secondary: P.yellow, dark: P.darkGold, accent: P.darkGold,
  },
};

const REP_TIERS = [
  { name: 'hostile',    color: P.brightRed,  border: P.darkRed,   accent: P.red },
  { name: 'unfriendly', color: P.orange,     border: P.darkRed,   accent: P.brightRed },
  { name: 'neutral',    color: P.gray,       border: P.midGray,   accent: P.lightGray },
  { name: 'friendly',   color: P.midGreen,   border: P.darkGreen, accent: P.lightGreen },
  { name: 'honored',    color: P.cyan,       border: P.navy,      accent: P.lightCyan },
  { name: 'exalted',    color: P.gold,       border: P.darkGold,  accent: P.yellow },
];

// ── Image Helpers ───────────────────────────────────────────────────────────

class PixelImage {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = Buffer.alloc(w * h * 4, 0); // All transparent
  }

  setPixel(x, y, color, alpha = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (y * this.width + x) * 4;
    this.data[idx] = color[0];
    this.data[idx + 1] = color[1];
    this.data[idx + 2] = color[2];
    this.data[idx + 3] = alpha;
  }

  fillRect(x, y, w, h, color, alpha = 255) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        this.setPixel(x + dx, y + dy, color, alpha);
  }

  drawRect(x, y, w, h, color) {
    for (let dx = 0; dx < w; dx++) { this.setPixel(x + dx, y, color); this.setPixel(x + dx, y + h - 1, color); }
    for (let dy = 0; dy < h; dy++) { this.setPixel(x, y + dy, color); this.setPixel(x + w - 1, y + dy, color); }
  }

  drawCircle(cx, cy, r, color) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++)
        if (x * x + y * y <= r * r) this.setPixel(cx + x, cy + y, color);
  }

  drawCircleOutline(cx, cy, r, color) {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = x * x + y * y;
        if (d <= r * r && d > (r - 1) * (r - 1)) this.setPixel(cx + x, cy + y, color);
      }
  }

  drawPattern(ox, oy, pattern, color) {
    for (let r = 0; r < pattern.length; r++)
      for (let c = 0; c < pattern[r].length; c++)
        if (pattern[r][c]) this.setPixel(ox + c, oy + r, color);
  }

  save(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const buf = encodePNG(this.width, this.height, this.data);
    fs.writeFileSync(filePath, buf);
    console.log(`  ✓ ${path.relative(process.cwd(), filePath)} (${this.width}×${this.height})`);
  }
}

// ── Asset Directories ───────────────────────────────────────────────────────
const BASE = path.resolve(__dirname, '..', 'assets');
const UI_FACTION = path.join(BASE, 'ui', 'faction');
const SPRITES_NPC = path.join(BASE, 'sprites', 'npcs');

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  1. FACTION EMBLEMS / CRESTS (32×32)                                     ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function generateFactionEmblems() {
  console.log('\n── Faction Emblems (32×32) ──');

  // Arcane Council: Arcane eye motif
  {
    const img = new PixelImage(32, 32);
    const f = FACTIONS.arcane;
    img.drawCircle(15, 15, 14, f.dark);
    img.drawCircleOutline(15, 15, 14, f.accent);
    img.drawCircleOutline(15, 15, 13, f.primary);
    // All-seeing eye
    img.drawPattern(5, 9, [
      [0,0,0,0,1,1,1,0,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,0,0,1,0,0,1,1,0],
      [1,1,0,0,1,1,1,0,0,1,1],
      [0,1,1,0,0,1,0,0,1,1,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,0,0,0,1,1,1,0,0,0,0],
    ], f.secondary);
    // Pupil
    img.setPixel(10, 12, P.white);
    // Sparkles
    img.setPixel(5, 4, f.secondary); img.setPixel(25, 4, f.secondary);
    img.setPixel(5, 26, f.secondary); img.setPixel(25, 26, f.secondary);
    img.setPixel(15, 3, f.secondary); img.setPixel(15, 27, f.secondary);
    img.save(path.join(UI_FACTION, 'icon_faction_emblem_arcane.png'));
  }

  // Shadow Guild: Crossed daggers
  {
    const img = new PixelImage(32, 32);
    const f = FACTIONS.shadow;
    img.drawCircle(15, 15, 14, f.dark);
    img.drawCircleOutline(15, 15, 14, f.accent);
    img.drawCircleOutline(15, 15, 13, f.primary);
    img.drawPattern(5, 6, [
      [0,0,1,0,0,0,0,0,0,1,0],
      [0,0,0,1,0,0,0,0,1,0,0],
      [0,0,0,0,1,0,0,1,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,1,1,1,0,0,0],
      [0,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,1,0,0,1,0,0,0],
      [0,0,0,1,0,0,0,0,1,0,0],
      [0,0,1,0,0,0,0,0,0,1,0],
      [0,1,1,0,0,0,0,0,0,1,1],
      [1,0,0,0,0,0,0,0,0,0,0],
    ], f.secondary);
    // Blade highlights
    img.setPixel(7, 8, P.lightOrange); img.setPixel(13, 8, P.lightOrange);
    img.setPixel(10, 11, P.white);
    img.save(path.join(UI_FACTION, 'icon_faction_emblem_shadow.png'));
  }

  // Frontier Rangers: Compass rose
  {
    const img = new PixelImage(32, 32);
    const f = FACTIONS.rangers;
    img.drawCircle(15, 15, 14, f.dark);
    img.drawCircleOutline(15, 15, 14, f.accent);
    img.drawCircleOutline(15, 15, 13, f.primary);
    // Compass
    img.drawPattern(5, 5, [
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,1,0,0,0,1,0,0,0,1,0],
      [1,1,1,1,1,0,1,1,1,1,1],
      [0,1,0,0,0,1,0,0,0,1,0],
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0,0],
    ], f.secondary);
    // Center dot
    img.setPixel(10, 10, P.white);
    // North highlight
    img.setPixel(10, 5, P.paleGreen);
    img.setPixel(10, 6, P.lightGreen);
    // Leaf accents at E/W
    img.setPixel(5, 10, P.paleGreen);
    img.setPixel(15, 10, P.paleGreen);
    img.save(path.join(UI_FACTION, 'icon_faction_emblem_rangers.png'));
  }

  // Artisan Collective: Hammer & anvil
  {
    const img = new PixelImage(32, 32);
    const f = FACTIONS.artisans;
    img.drawCircle(15, 15, 14, f.dark);
    img.drawCircleOutline(15, 15, 14, f.accent);
    img.drawCircleOutline(15, 15, 13, f.primary);
    // Hammer
    img.drawPattern(8, 5, [
      [0,0,0,1,1,1,0,0],
      [0,0,0,1,1,1,0,0],
      [0,0,0,0,1,0,0,0],
      [0,0,0,0,1,0,0,0],
      [0,0,0,0,1,0,0,0],
      [0,0,0,0,1,0,0,0],
      [0,0,0,0,1,0,0,0],
    ], f.secondary);
    // Hammer head highlight
    img.setPixel(11, 5, P.paleYellow); img.setPixel(12, 5, P.paleYellow); img.setPixel(13, 5, P.paleYellow);
    // Anvil
    img.drawPattern(5, 17, [
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,0,0,0],
      [0,0,0,0,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,0],
    ], f.primary);
    img.drawPattern(5, 17, [
      [0,0,1,1,1,1,1,1,1,0,0],
    ], P.yellow);
    // Gear teeth
    img.setPixel(15, 2, f.secondary); img.setPixel(15, 28, f.secondary);
    img.setPixel(2, 15, f.secondary); img.setPixel(28, 15, f.secondary);
    img.save(path.join(UI_FACTION, 'icon_faction_emblem_artisans.png'));
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  2. REPUTATION BADGE ICONS (32×32)                                       ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function generateReputationBadges() {
  console.log('\n── Reputation Badge Icons (32×32) ──');

  // Hostile: Skull
  {
    const t = REP_TIERS[0];
    const img = new PixelImage(32, 32);
    img.drawCircle(15, 15, 14, P.darkGray);
    img.drawCircleOutline(15, 15, 14, t.border);
    img.drawCircleOutline(15, 15, 13, t.color);
    img.drawPattern(5, 7, [
      [0,0,0,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,1,1,1,0],
      [0,1,0,0,1,1,1,0,0,1,0],
      [0,1,0,0,1,1,1,0,0,1,0],
      [0,0,1,1,1,0,1,1,1,0,0],
      [0,0,0,1,0,1,0,1,0,0,0],
      [0,0,0,1,1,1,1,1,0,0,0],
    ], t.color);
    img.fillRect(7, 11, 2, 2, P.black);
    img.fillRect(12, 11, 2, 2, P.black);
    img.save(path.join(UI_FACTION, `icon_rep_badge_${t.name}.png`));
  }

  // Unfriendly: Warning triangle
  {
    const t = REP_TIERS[1];
    const img = new PixelImage(32, 32);
    img.drawCircle(15, 15, 14, P.darkGray);
    img.drawCircleOutline(15, 15, 14, t.border);
    img.drawCircleOutline(15, 15, 13, t.color);
    img.drawPattern(5, 6, [
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,0,1,0,0,0,0],
      [0,0,0,0,1,0,1,0,0,0,0],
      [0,0,0,1,0,0,0,1,0,0,0],
      [0,0,0,1,0,1,0,1,0,0,0],
      [0,0,1,0,0,1,0,0,1,0,0],
      [0,0,1,0,0,0,0,0,1,0,0],
      [0,1,0,0,0,1,0,0,0,1,0],
      [0,1,1,1,1,1,1,1,1,1,0],
    ], t.color);
    img.setPixel(10, 10, P.paleYellow); img.setPixel(10, 11, P.paleYellow);
    img.setPixel(10, 13, P.paleYellow);
    img.save(path.join(UI_FACTION, `icon_rep_badge_${t.name}.png`));
  }

  // Neutral: Balance scales
  {
    const t = REP_TIERS[2];
    const img = new PixelImage(32, 32);
    img.drawCircle(15, 15, 14, P.darkGray);
    img.drawCircleOutline(15, 15, 14, t.border);
    img.drawCircleOutline(15, 15, 13, t.color);
    img.drawPattern(5, 7, [
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,1,1,1,1,1,1,1,1,1,0],
      [0,1,0,0,0,1,0,0,0,1,0],
      [1,0,1,0,0,1,0,0,1,0,1],
      [1,0,0,1,0,1,0,1,0,0,1],
      [0,1,0,0,0,1,0,0,0,1,0],
      [0,1,1,1,0,1,0,1,1,1,0],
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0,0],
    ], t.color);
    img.setPixel(10, 7, P.silver);
    img.save(path.join(UI_FACTION, `icon_rep_badge_${t.name}.png`));
  }

  // Friendly: Handshake
  {
    const t = REP_TIERS[3];
    const img = new PixelImage(32, 32);
    img.drawCircle(15, 15, 14, P.darkGray);
    img.drawCircleOutline(15, 15, 14, t.border);
    img.drawCircleOutline(15, 15, 13, t.color);
    img.drawPattern(4, 8, [
      [0,0,1,1,0,0,0,0,0,1,1,0,0],
      [0,1,1,0,1,0,0,0,1,0,1,1,0],
      [1,1,0,0,0,1,0,1,0,0,0,1,1],
      [1,0,0,0,0,0,1,0,0,0,0,0,1],
      [1,0,0,0,0,1,1,1,0,0,0,0,1],
      [0,1,0,0,1,1,0,1,1,0,0,1,0],
      [0,0,1,1,1,0,0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0,0,0,1,0,0,0],
    ], t.color);
    img.setPixel(10, 14, t.accent);
    img.save(path.join(UI_FACTION, `icon_rep_badge_${t.name}.png`));
  }

  // Honored: Star medal
  {
    const t = REP_TIERS[4];
    const img = new PixelImage(32, 32);
    img.drawCircle(15, 15, 14, P.darkGray);
    img.drawCircleOutline(15, 15, 14, t.border);
    img.drawCircleOutline(15, 15, 13, t.color);
    img.drawPattern(5, 6, [
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,0,1,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,0],
      [0,0,1,1,1,1,1,1,1,0,0],
      [0,0,0,1,1,1,1,1,0,0,0],
      [0,0,1,1,0,0,0,1,1,0,0],
      [0,1,1,0,0,0,0,0,1,1,0],
      [1,1,0,0,0,0,0,0,0,1,1],
    ], t.color);
    img.setPixel(10, 11, P.white);
    img.setPixel(10, 10, t.accent);
    img.save(path.join(UI_FACTION, `icon_rep_badge_${t.name}.png`));
  }

  // Exalted: Crown
  {
    const t = REP_TIERS[5];
    const img = new PixelImage(32, 32);
    img.drawCircle(15, 15, 14, P.darkGray);
    img.drawCircleOutline(15, 15, 14, t.border);
    img.drawCircleOutline(15, 15, 13, t.color);
    img.drawPattern(5, 8, [
      [0,1,0,0,0,1,0,0,0,1,0],
      [0,1,0,0,1,1,1,0,0,1,0],
      [1,1,1,0,1,1,1,0,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1],
      [0,1,1,1,1,1,1,1,1,1,0],
      [0,1,1,1,1,1,1,1,1,1,0],
    ], t.color);
    // Crown point highlights
    img.drawPattern(5, 8, [[0,1,0,0,0,1,0,0,0,1,0]], t.accent);
    // Gems
    img.setPixel(7, 13, P.brightRed);
    img.setPixel(10, 13, P.midPurple);
    img.setPixel(13, 13, P.cyan);
    img.save(path.join(UI_FACTION, `icon_rep_badge_${t.name}.png`));
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  3. FACTION VENDOR NPC SPRITES (16×24)                                   ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function drawBaseBody(img, skinColor, robeColor, robeDark, beltColor) {
  // Head
  img.drawPattern(0, 3, [
    [0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0],
  ], skinColor);
  // Eyes
  img.setPixel(6, 4, P.black);
  img.setPixel(9, 4, P.black);

  // Body
  img.drawPattern(0, 6, [
    [0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0],
    [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  ], robeColor);

  // Robe shading
  for (let dy = 6; dy < 18; dy++) {
    img.setPixel(3, dy, robeDark);
    if (dy >= 8) img.setPixel(4, dy, robeDark);
  }

  // Belt
  img.fillRect(4, 11, 7, 1, beltColor);

  // Feet
  img.drawPattern(0, 18, [
    [0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0],
  ], P.brown);
}

function generateFactionVendorNPCs() {
  console.log('\n── Faction Vendor NPC Sprites (16×24) ──');

  // Arcane Council vendor (purple mage with pointy hat)
  {
    const img = new PixelImage(16, 24);
    const f = FACTIONS.arcane;
    drawBaseBody(img, P.sand, f.primary, f.accent, f.secondary);
    // Hair/pointy hat
    img.drawPattern(0, 0, [
      [0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
    ], f.primary);
    img.setPixel(7, 0, f.secondary); // Hat tip sparkle
    // Staff in right hand
    img.fillRect(13, 2, 1, 16, P.midBrown);
    img.setPixel(13, 1, f.secondary);
    img.setPixel(13, 2, f.secondary);
    img.save(path.join(SPRITES_NPC, 'char_npc_vendor_arcane.png'));
  }

  // Shadow Guild vendor (hooded rogue)
  {
    const img = new PixelImage(16, 24);
    const f = FACTIONS.shadow;
    drawBaseBody(img, P.sand, P.darkGray, P.black, f.primary);
    // Hood
    img.drawPattern(0, 1, [
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0],
      [0,0,0,1,1,0,0,0,0,0,1,1,0,0,0,0],
    ], f.dark);
    // Glowing eyes
    img.setPixel(6, 4, P.brightRed);
    img.setPixel(9, 4, P.brightRed);
    // Dagger at side
    img.fillRect(13, 8, 1, 5, P.silver);
    img.setPixel(13, 7, P.lightGray);
    img.setPixel(13, 13, P.midBrown);
    img.save(path.join(SPRITES_NPC, 'char_npc_vendor_shadow.png'));
  }

  // Frontier Rangers vendor (ranger with bow)
  {
    const img = new PixelImage(16, 24);
    const f = FACTIONS.rangers;
    drawBaseBody(img, P.tan, f.primary, f.accent, P.lightGreen);
    // Ranger hat
    img.drawPattern(0, 1, [
      [0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
    ], f.accent);
    img.setPixel(9, 1, P.lightGreen); // Feather
    img.setPixel(10, 0, P.lightGreen);
    // Bow
    for (let y = 6; y <= 12; y++) img.setPixel(13, y, P.midBrown);
    img.setPixel(12, 6, P.midBrown); img.setPixel(12, 12, P.midBrown);
    for (let y = 7; y <= 11; y++) img.setPixel(12, y, P.cream); // Bowstring
    img.save(path.join(SPRITES_NPC, 'char_npc_vendor_rangers.png'));
  }

  // Artisan Collective vendor (craftsman with apron)
  {
    const img = new PixelImage(16, 24);
    const f = FACTIONS.artisans;
    drawBaseBody(img, P.tan, P.midBrown, P.brown, f.primary);
    // Headband
    img.fillRect(5, 3, 6, 1, f.primary);
    // Apron
    img.drawPattern(0, 12, [
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0],
    ], P.cream);
    // Hammer
    img.setPixel(13, 8, P.gray); img.setPixel(13, 9, P.gray);
    img.setPixel(12, 7, P.lightGray); img.setPixel(13, 7, P.lightGray); img.setPixel(14, 7, P.lightGray);
    img.save(path.join(SPRITES_NPC, 'char_npc_vendor_artisans.png'));
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  4. FACTION REWARD ITEM ICONS (32×32)                                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function generateFactionRewardIcons() {
  console.log('\n── Faction Reward Item Icons (32×32) ──');

  for (const [fKey, f] of Object.entries(FACTIONS)) {
    // Title Scroll
    {
      const img = new PixelImage(32, 32);
      img.fillRect(4, 6, 24, 20, P.cream);
      img.fillRect(5, 7, 22, 18, P.sand);
      img.fillRect(3, 5, 26, 2, P.tan);
      img.fillRect(3, 25, 26, 2, P.tan);
      img.drawRect(3, 5, 26, 2, P.midBrown);
      img.drawRect(3, 25, 26, 2, P.midBrown);
      // Faction seal
      img.drawCircle(15, 15, 5, f.primary);
      img.drawCircleOutline(15, 15, 5, f.dark);
      img.setPixel(15, 15, f.secondary);
      // Text lines
      img.fillRect(8, 10, 6, 1, P.midBrown);
      img.fillRect(17, 10, 6, 1, P.midBrown);
      img.fillRect(8, 21, 15, 1, P.midBrown);
      img.fillRect(8, 23, 12, 1, P.midBrown);
      img.save(path.join(UI_FACTION, `icon_reward_title_${f.key}.png`));
    }

    // Gear Border
    {
      const img = new PixelImage(32, 32);
      img.drawRect(1, 1, 30, 30, f.dark);
      img.drawRect(2, 2, 28, 28, f.primary);
      img.drawRect(3, 3, 26, 26, f.dark);
      // Corner ornaments
      for (const [cx, cy] of [[1,1],[28,1],[1,28],[28,28]]) {
        img.fillRect(cx, cy, 3, 3, f.secondary);
      }
      // Side accents
      img.setPixel(15, 1, f.secondary); img.setPixel(16, 1, f.secondary);
      img.setPixel(15, 30, f.secondary); img.setPixel(16, 30, f.secondary);
      img.setPixel(1, 15, f.secondary); img.setPixel(1, 16, f.secondary);
      img.setPixel(30, 15, f.secondary); img.setPixel(30, 16, f.secondary);
      img.save(path.join(UI_FACTION, `icon_reward_gear_border_${f.key}.png`));
    }

    // Portrait Frame
    {
      const img = new PixelImage(32, 32);
      // Frame body
      img.fillRect(0, 0, 32, 32, f.dark);
      // Transparent inner
      for (let y = 4; y < 28; y++)
        for (let x = 4; x < 28; x++)
          img.setPixel(x, y, [0,0,0], 0);
      // Frame borders
      img.drawRect(0, 0, 32, 32, f.primary);
      img.drawRect(1, 1, 30, 30, f.secondary);
      img.drawRect(2, 2, 28, 28, f.primary);
      img.drawRect(3, 3, 26, 26, f.dark);
      // Corner flourishes
      for (const [cx, cy] of [[0,0],[28,0],[0,28],[28,28]]) {
        img.fillRect(cx, cy, 4, 4, f.secondary);
        img.setPixel(cx+1, cy+1, P.white);
      }
      // Top center crest
      img.fillRect(13, 0, 6, 3, f.secondary);
      img.setPixel(15, 0, P.white); img.setPixel(16, 0, P.white);
      img.save(path.join(UI_FACTION, `icon_reward_frame_${f.key}.png`));
    }
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  5. FACTION BANNERS / FLAGS (16×32)                                      ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

function generateFactionBanners() {
  console.log('\n── Faction Banners (16×32) ──');

  for (const [fKey, f] of Object.entries(FACTIONS)) {
    const img = new PixelImage(16, 32);
    // Pole
    img.fillRect(7, 0, 2, 32, P.gray);
    img.setPixel(7, 0, P.lightGray); img.setPixel(8, 0, P.lightGray);
    // Pole cap
    img.fillRect(6, 0, 4, 1, P.silver);

    // Banner cloth
    for (let y = 2; y < 26; y++) {
      let halfW = y < 20 ? 6 : Math.max(1, 6 - (y - 19));
      for (let x = 8 - halfW; x < 8 + halfW; x++) {
        const color = (x === 8 - halfW || x === 8 + halfW - 1) ? f.dark : f.primary;
        img.setPixel(x, y, color);
      }
    }

    // Crossbar
    img.fillRect(2, 2, 12, 1, f.dark);
    img.fillRect(2, 3, 12, 1, f.accent);

    // Emblem
    img.drawCircle(8, 11, 3, f.dark);
    img.drawCircleOutline(8, 11, 3, f.secondary);
    img.setPixel(8, 11, f.secondary);

    // Tattered edges
    img.setPixel(3, 15, [0,0,0], 0);
    img.setPixel(12, 18, [0,0,0], 0);

    img.save(path.join(BASE, 'sprites', 'characters', 'equipment', `banner_faction_${f.key}.png`));
  }
}

// ╔═══════════════════════════════════════════════════════════════════════════╗
// ║  MAIN                                                                    ║
// ╚═══════════════════════════════════════════════════════════════════════════╝

console.log('=== PixelRealm Faction & Reputation Asset Generator ===');
console.log(`Palette: 32-color master palette`);
console.log(`Target: ${UI_FACTION}, ${SPRITES_NPC}`);

generateFactionEmblems();
generateReputationBadges();
generateFactionVendorNPCs();
generateFactionRewardIcons();
generateFactionBanners();

console.log('\n=== Done! All faction/reputation assets generated. ===');
