#!/usr/bin/env node
/**
 * generate-loading-screens.mjs
 * Generates zone-specific 320×180 pixel art loading screen backgrounds
 * for all 19 PixelRealm zones using Sharp.
 *
 * Output: assets/backgrounds/loading/bg_loading_zone{N}_{slug}.png
 */

import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const WIDTH = 320;
const HEIGHT = 180;
const OUT_DIR = join(import.meta.dirname, '..', 'assets', 'backgrounds', 'loading');

// ── Pixel Font (5×7 uppercase + digits) ──────────────────────────────────────
// Each char is a 5-wide × 7-tall bitmap stored as array of 7 numbers (row bitmasks)
const FONT = {
  A: [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  B: [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
  C: [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
  D: [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
  E: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
  F: [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
  G: [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
  H: [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
  I: [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  J: [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
  K: [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
  L: [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
  M: [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
  N: [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
  O: [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  P: [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
  Q: [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
  R: [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
  S: [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
  T: [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
  U: [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
  V: [0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b01010, 0b00100],
  W: [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
  X: [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
  Y: [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
  Z: [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
  '0': [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
  '1': [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
  '2': [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
  '3': [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
  '4': [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
  '5': [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
  '6': [0b00110, 0b01000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
  '7': [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
  '8': [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
  '9': [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00010, 0b01100],
  ' ': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
  '-': [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
  '/': [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
  '+': [0b00000, 0b00100, 0b00100, 0b11111, 0b00100, 0b00100, 0b00000],
  '(': [0b00010, 0b00100, 0b01000, 0b01000, 0b01000, 0b00100, 0b00010],
  ')': [0b01000, 0b00100, 0b00010, 0b00010, 0b00010, 0b00100, 0b01000],
  '.': [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b01100, 0b01100],
  ':': [0b00000, 0b01100, 0b01100, 0b00000, 0b01100, 0b01100, 0b00000],
  '\'': [0b00100, 0b00100, 0b01000, 0b00000, 0b00000, 0b00000, 0b00000],
};

// ── Color Helpers ────────────────────────────────────────────────────────────
function hexToRgb(hex) {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

function brighten(rgb, factor) {
  return [
    Math.min(255, Math.round(rgb[0] * factor)),
    Math.min(255, Math.round(rgb[1] * factor)),
    Math.min(255, Math.round(rgb[2] * factor)),
  ];
}

function darken(rgb, factor) {
  return brighten(rgb, 1 - factor);
}

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Pixel Buffer Class ───────────────────────────────────────────────────────
class PixelBuffer {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4); // RGBA
  }

  setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a < 255 && a > 0) {
      const srcA = a / 255;
      const dstA = 1 - srcA;
      this.data[i]     = Math.round(r * srcA + this.data[i] * dstA);
      this.data[i + 1] = Math.round(g * srcA + this.data[i + 1] * dstA);
      this.data[i + 2] = Math.round(b * srcA + this.data[i + 2] * dstA);
      this.data[i + 3] = 255;
    } else {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = a;
    }
  }

  getPixel(x, y) {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return [0, 0, 0, 0];
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  fill(r, g, b) {
    for (let i = 0; i < this.w * this.h * 4; i += 4) {
      this.data[i] = r;
      this.data[i + 1] = g;
      this.data[i + 2] = b;
      this.data[i + 3] = 255;
    }
  }

  fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, r, g, b, a);
      }
    }
  }

  drawText(text, x, y, rgb, scale = 1) {
    const chars = text.toUpperCase().split('');
    let cx = x;
    for (const ch of chars) {
      const glyph = FONT[ch];
      if (glyph) {
        for (let row = 0; row < 7; row++) {
          for (let col = 0; col < 5; col++) {
            if (glyph[row] & (1 << (4 - col))) {
              for (let sy = 0; sy < scale; sy++) {
                for (let sx = 0; sx < scale; sx++) {
                  this.setPixel(cx + col * scale + sx, y + row * scale + sy, rgb[0], rgb[1], rgb[2]);
                }
              }
            }
          }
        }
      }
      cx += 6 * scale; // 5px char + 1px gap, scaled
    }
  }

  measureText(text, scale = 1) {
    return text.length * 6 * scale - scale; // minus trailing gap
  }

  drawTextCentered(text, cy, rgb, scale = 1) {
    const w = this.measureText(text, scale);
    const x = Math.floor((this.w - w) / 2);
    this.drawText(text, x, cy, rgb, scale);
  }

  // Gradient fill from top to bottom
  vertGradient(y1, y2, c1, c2) {
    const span = Math.max(1, y2 - y1);
    for (let y = y1; y < y2; y++) {
      const t = (y - y1) / span;
      const c = lerpColor(c1, c2, t);
      for (let x = 0; x < this.w; x++) {
        this.setPixel(x, y, c[0], c[1], c[2]);
      }
    }
  }

  // Draw a filled circle
  fillCircle(cx, cy, r, rgb, a = 255) {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) {
          this.setPixel(cx + x, cy + y, rgb[0], rgb[1], rgb[2], a);
        }
      }
    }
  }

  // Draw horizontal line
  hLine(x1, x2, y, rgb, a = 255) {
    for (let x = x1; x <= x2; x++) {
      this.setPixel(x, y, rgb[0], rgb[1], rgb[2], a);
    }
  }

  // Draw vertical line
  vLine(x, y1, y2, rgb, a = 255) {
    for (let y = y1; y <= y2; y++) {
      this.setPixel(x, y, rgb[0], rgb[1], rgb[2], a);
    }
  }
}

// ── Terrain Helpers ──────────────────────────────────────────────────────────

// Generate a smooth terrain line using multiple sine waves
function terrainLine(w, baseY, amplitude, rng, octaves = 3) {
  const heights = new Array(w).fill(baseY);
  for (let o = 0; o < octaves; o++) {
    const freq = (0.005 + rng() * 0.01) * (o + 1);
    const amp = amplitude / (o + 1);
    const phase = rng() * Math.PI * 2;
    for (let x = 0; x < w; x++) {
      heights[x] += Math.sin(x * freq + phase) * amp;
    }
  }
  return heights.map(h => Math.round(h));
}

// Fill below a terrain line with a color
function fillBelowTerrain(buf, heights, rgb, maxY = HEIGHT) {
  for (let x = 0; x < buf.w; x++) {
    for (let y = heights[x]; y < maxY; y++) {
      buf.setPixel(x, y, rgb[0], rgb[1], rgb[2]);
    }
  }
}

// ── Decorative Elements ──────────────────────────────────────────────────────

function drawPixelTree(buf, x, y, trunkColor, leafColor, size = 1) {
  const s = size;
  // Trunk
  buf.fillRect(x, y - 2 * s, s, 3 * s, trunkColor[0], trunkColor[1], trunkColor[2]);
  // Canopy (diamond shape)
  for (let dy = -4 * s; dy <= -2 * s; dy++) {
    const w = Math.max(1, (4 * s - Math.abs(dy + 3 * s)) );
    for (let dx = -w; dx <= w; dx++) {
      buf.setPixel(x + dx, y + dy, leafColor[0], leafColor[1], leafColor[2]);
    }
  }
}

function drawPineTree(buf, x, y, trunkColor, leafColor, h = 10) {
  // Trunk
  buf.fillRect(x, y - 2, 1, 3, trunkColor[0], trunkColor[1], trunkColor[2]);
  // Triangle canopy
  for (let dy = 0; dy < h; dy++) {
    const w = Math.floor(dy * 0.6);
    buf.hLine(x - w, x + w, y - 2 - h + dy, leafColor);
  }
}

function drawCactus(buf, x, y, color) {
  buf.fillRect(x, y - 8, 2, 9, color[0], color[1], color[2]);
  buf.fillRect(x - 3, y - 6, 3, 2, color[0], color[1], color[2]);
  buf.fillRect(x - 3, y - 8, 2, 2, color[0], color[1], color[2]);
  buf.fillRect(x + 2, y - 4, 3, 2, color[0], color[1], color[2]);
  buf.fillRect(x + 3, y - 6, 2, 2, color[0], color[1], color[2]);
}

function drawStar(buf, x, y, rgb, size = 1) {
  buf.setPixel(x, y, rgb[0], rgb[1], rgb[2]);
  if (size > 1) {
    buf.setPixel(x - 1, y, rgb[0], rgb[1], rgb[2], 128);
    buf.setPixel(x + 1, y, rgb[0], rgb[1], rgb[2], 128);
    buf.setPixel(x, y - 1, rgb[0], rgb[1], rgb[2], 128);
    buf.setPixel(x, y + 1, rgb[0], rgb[1], rgb[2], 128);
  }
}

function drawCloud(buf, x, y, rgb) {
  buf.fillRect(x, y, 8, 3, rgb[0], rgb[1], rgb[2]);
  buf.fillRect(x + 2, y - 2, 4, 2, rgb[0], rgb[1], rgb[2]);
  buf.fillRect(x - 1, y + 1, 2, 1, rgb[0], rgb[1], rgb[2]);
}

function drawMountain(buf, x, y, baseW, color, snowColor = null) {
  const halfW = Math.floor(baseW / 2);
  const peakH = Math.floor(baseW * 0.7);
  for (let dy = 0; dy < peakH; dy++) {
    const w = Math.floor(halfW * (dy / peakH));
    buf.hLine(x - w, x + w, y - peakH + dy, color);
  }
  // Snow cap
  if (snowColor) {
    const capH = Math.floor(peakH * 0.25);
    for (let dy = 0; dy < capH; dy++) {
      const w = Math.floor(halfW * (dy / peakH));
      buf.hLine(x - w, x + w, y - peakH + dy, snowColor);
    }
  }
}

function drawArch(buf, x, y, w, h, color, glowColor = null) {
  // Two pillars
  const pillarW = Math.max(2, Math.floor(w / 6));
  buf.fillRect(x, y - h, pillarW, h, color[0], color[1], color[2]);
  buf.fillRect(x + w - pillarW, y - h, pillarW, h, color[0], color[1], color[2]);
  // Arch top
  const cx = x + Math.floor(w / 2);
  const cy = y - h;
  for (let dx = 0; dx <= Math.floor(w / 2); dx++) {
    const dy = Math.floor(Math.sqrt(Math.max(0, (w / 2) ** 2 - dx ** 2)) * 0.3);
    buf.setPixel(cx + dx, cy - dy, color[0], color[1], color[2]);
    buf.setPixel(cx - dx, cy - dy, color[0], color[1], color[2]);
  }
  // Glow inside arch
  if (glowColor) {
    buf.fillCircle(cx, y - Math.floor(h * 0.5), Math.floor(w / 5), glowColor, 160);
  }
}

function drawCrystal(buf, x, y, color, h = 8) {
  const halfW = Math.max(1, Math.floor(h / 4));
  for (let dy = 0; dy < h; dy++) {
    const w = dy < h / 2
      ? Math.floor(halfW * (dy / (h / 2)))
      : Math.floor(halfW * ((h - dy) / (h / 2)));
    buf.hLine(x - w, x + w, y - h + dy, color);
  }
  // Bright tip
  buf.setPixel(x, y - h, brighten(color, 2)[0], brighten(color, 2)[1], brighten(color, 2)[2]);
}

function drawWaves(buf, y, color, rng, count = 3) {
  for (let w = 0; w < count; w++) {
    const waveY = y + w * 4;
    const phase = rng() * Math.PI * 2;
    const freq = 0.03 + rng() * 0.02;
    for (let x = 0; x < buf.w; x++) {
      const dy = Math.round(Math.sin(x * freq + phase) * 2);
      buf.setPixel(x, waveY + dy, color[0], color[1], color[2], 180 - w * 40);
    }
  }
}

function drawLava(buf, y, color, brightColor, rng) {
  for (let x = 0; x < buf.w; x++) {
    const h = Math.floor(rng() * 3);
    for (let dy = 0; dy < 4 + h; dy++) {
      const c = dy < 2 ? brightColor : color;
      buf.setPixel(x, y + dy, c[0], c[1], c[2]);
    }
  }
}

// Scatter small dots (e.g., particles, stars)
function scatterDots(buf, count, yMin, yMax, rgb, rng, sizeRange = [1, 1]) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * buf.w);
    const y = yMin + Math.floor(rng() * (yMax - yMin));
    const s = sizeRange[0] + Math.floor(rng() * (sizeRange[1] - sizeRange[0] + 1));
    if (s <= 1) {
      buf.setPixel(x, y, rgb[0], rgb[1], rgb[2], 100 + Math.floor(rng() * 155));
    } else {
      buf.fillCircle(x, y, s, rgb, 80 + Math.floor(rng() * 100));
    }
  }
}

// ── Zone Definitions ─────────────────────────────────────────────────────────
const ZONES = [
  { id: 1, name: 'Verdant Hollow', biome: 'forest', levelRange: '1-3',
    bg: 0x0d1f0d, ground: 0x1e5a10, wall: 0x0a2408, accent: 0x44dd44 },
  { id: 2, name: 'Dusty Trail', biome: 'desert', levelRange: '3-5',
    bg: 0x2a1a08, ground: 0x5a3a10, wall: 0x3a2408, accent: 0xffaa44 },
  { id: 3, name: 'Ironveil Ruins', biome: 'dungeon', levelRange: '5-7',
    bg: 0x0a0a1a, ground: 0x252540, wall: 0x080818, accent: 0xaa88ff },
  { id: 4, name: 'Saltmarsh Harbor', biome: 'coastal', levelRange: '7-9',
    bg: 0x061825, ground: 0x0d3050, wall: 0x041020, accent: 0x22aacc },
  { id: 5, name: 'Ice Caverns', biome: 'ice', levelRange: '9-11',
    bg: 0x040f1a, ground: 0x0d2a42, wall: 0x020a14, accent: 0x44aaff },
  { id: 6, name: 'Volcanic Highlands', biome: 'volcanic', levelRange: '11-14',
    bg: 0x1a0800, ground: 0x4a1500, wall: 0x100500, accent: 0xff5500 },
  { id: 7, name: 'Shadowmire Swamp', biome: 'swamp', levelRange: '14-17',
    bg: 0x060e04, ground: 0x1a3a12, wall: 0x030802, accent: 0x44cc44 },
  { id: 8, name: 'Frostpeak Highlands', biome: 'mountain_ice', levelRange: '17-20',
    bg: 0x050d1a, ground: 0x0e2a4a, wall: 0x030a12, accent: 0x88ccff },
  { id: 9, name: 'Celestial Spire', biome: 'celestial', levelRange: '20-23',
    bg: 0x050a1a, ground: 0x0a1540, wall: 0x03071a, accent: 0xaaccff },
  { id: 10, name: 'Abyssal Depths', biome: 'deep_sea', levelRange: '23-26',
    bg: 0x000a14, ground: 0x001a2e, wall: 0x00060e, accent: 0x0088cc },
  { id: 11, name: 'Dragonbone Wastes', biome: 'wasteland', levelRange: '26-29',
    bg: 0x1a0e05, ground: 0x3d2a1a, wall: 0x140a03, accent: 0xff8c00 },
  { id: 12, name: 'Void Sanctum', biome: 'void', levelRange: '29-32',
    bg: 0x050008, ground: 0x0d001a, wall: 0x020005, accent: 0xcc33ff },
  { id: 13, name: 'Eclipsed Throne', biome: 'eclipse', levelRange: '32-35',
    bg: 0x0d0800, ground: 0x2d1500, wall: 0x080400, accent: 0xffaa00 },
  { id: 14, name: 'Shattered Dominion', biome: 'shattered', levelRange: '35-38',
    bg: 0x0a0012, ground: 0x1a0030, wall: 0x050008, accent: 0xcc00ff },
  { id: 15, name: 'Primordial Core', biome: 'core', levelRange: '38-41',
    bg: 0x0d0600, ground: 0x1a0800, wall: 0x080300, accent: 0xff6600 },
  { id: 16, name: 'Ethereal Nexus', biome: 'ethereal', levelRange: '41-44',
    bg: 0x010510, ground: 0x061028, wall: 0x010208, accent: 0x00aaff },
  { id: 17, name: 'Twilight Citadel', biome: 'twilight', levelRange: '44-47',
    bg: 0x0c0410, ground: 0x1a0b28, wall: 0x080210, accent: 0xaa55ff },
  { id: 18, name: 'Oblivion Spire', biome: 'oblivion', levelRange: '47-50',
    bg: 0x030208, ground: 0x0a0820, wall: 0x020106, accent: 0xffd040 },
  { id: 19, name: 'Astral Pinnacle', biome: 'astral', levelRange: '50+',
    bg: 0x020212, ground: 0x0a0835, wall: 0x010108, accent: 0x88ccff },
];

// ── Scene Renderers (per biome type) ─────────────────────────────────────────

function renderForest(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const wall = hexToRgb(zone.wall);
  const accent = hexToRgb(zone.accent);

  // Sky gradient
  buf.vertGradient(0, 90, [20, 40, 60], bg);
  buf.vertGradient(90, HEIGHT, bg, wall);

  // Background hills
  const hills1 = terrainLine(WIDTH, 100, 20, rng);
  fillBelowTerrain(buf, hills1, darken(ground, 0.3));
  const hills2 = terrainLine(WIDTH, 120, 15, rng);
  fillBelowTerrain(buf, hills2, darken(ground, 0.15));

  // Foreground terrain
  const terrain = terrainLine(WIDTH, 140, 10, rng);
  fillBelowTerrain(buf, terrain, ground);

  // Ground detail
  const subsoil = terrainLine(WIDTH, 160, 5, rng);
  fillBelowTerrain(buf, subsoil, wall);

  // Trees on hills
  const trunkColor = hexToRgb(0x3b2010);
  for (let i = 0; i < 12; i++) {
    const tx = Math.floor(rng() * WIDTH);
    const ty = hills2[tx] - 1;
    drawPineTree(buf, tx, ty, trunkColor, darken(accent, 0.2), 8 + Math.floor(rng() * 4));
  }
  // Foreground trees
  for (let i = 0; i < 8; i++) {
    const tx = Math.floor(rng() * WIDTH);
    const ty = terrain[tx] - 1;
    drawPineTree(buf, tx, ty, trunkColor, accent, 10 + Math.floor(rng() * 5));
  }

  // Fireflies / particles
  scatterDots(buf, 15, 40, 130, accent, rng);
}

function renderDesert(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Sky gradient (warm)
  buf.vertGradient(0, 80, brighten(accent, 0.6), brighten(bg, 1.5));
  buf.vertGradient(80, HEIGHT, brighten(bg, 1.5), bg);

  // Sun
  buf.fillCircle(260, 30, 8, brighten(accent, 1.5));
  buf.fillCircle(260, 30, 6, [255, 220, 120]);

  // Dunes
  const dunes1 = terrainLine(WIDTH, 110, 25, rng, 2);
  fillBelowTerrain(buf, dunes1, brighten(ground, 0.8));
  const dunes2 = terrainLine(WIDTH, 130, 15, rng, 2);
  fillBelowTerrain(buf, dunes2, ground);
  const dunes3 = terrainLine(WIDTH, 150, 10, rng);
  fillBelowTerrain(buf, dunes3, darken(ground, 0.2));

  // Cacti
  const cactusColor = [60, 100, 40];
  for (let i = 0; i < 5; i++) {
    const cx = 30 + Math.floor(rng() * 260);
    const cy = dunes2[cx] - 1;
    drawCactus(buf, cx, cy, cactusColor);
  }

  // Sand particles
  scatterDots(buf, 20, 80, 160, accent, rng);

  // Path/trail
  const trailY = terrainLine(WIDTH, 148, 3, rng, 1);
  for (let x = 0; x < WIDTH; x++) {
    buf.setPixel(x, trailY[x], accent[0], accent[1], accent[2], 80);
  }
}

function renderDungeon(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const wall = hexToRgb(zone.wall);
  const accent = hexToRgb(zone.accent);

  buf.fill(bg[0], bg[1], bg[2]);

  // Stone floor
  buf.fillRect(0, 140, WIDTH, 40, wall[0], wall[1], wall[2]);
  buf.fillRect(0, 138, WIDTH, 3, ground[0], ground[1], ground[2]);

  // Arches
  for (let i = 0; i < 3; i++) {
    const ax = 60 + i * 100;
    drawArch(buf, ax - 15, 140, 30, 50, ground, accent);
  }

  // Floating runes
  for (let i = 0; i < 8; i++) {
    const rx = Math.floor(rng() * WIDTH);
    const ry = 30 + Math.floor(rng() * 80);
    buf.setPixel(rx, ry, accent[0], accent[1], accent[2], 120 + Math.floor(rng() * 135));
    buf.setPixel(rx + 1, ry, accent[0], accent[1], accent[2], 80);
  }

  // Pillars / wall detail
  for (let x = 0; x < WIDTH; x += 32) {
    buf.fillRect(x, 20, 3, 120, darken(ground, 0.2)[0], darken(ground, 0.2)[1], darken(ground, 0.2)[2], 80);
  }

  // Ceiling details
  buf.fillRect(0, 0, WIDTH, 8, wall[0], wall[1], wall[2]);
  for (let x = 0; x < WIDTH; x += 16) {
    buf.fillRect(x, 8, 2, 4, ground[0], ground[1], ground[2]);
  }
}

function renderCoastal(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Sky
  buf.vertGradient(0, 70, [40, 80, 140], brighten(bg, 2));
  // Sea
  buf.vertGradient(70, 130, brighten(accent, 0.7), ground);
  // Deep water
  buf.vertGradient(130, HEIGHT, ground, darken(ground, 0.3));

  // Clouds
  const cloudColor = [200, 220, 240];
  for (let i = 0; i < 4; i++) {
    drawCloud(buf, Math.floor(rng() * 300), 15 + Math.floor(rng() * 30), cloudColor);
  }

  // Water surface shimmer
  drawWaves(buf, 68, brighten(accent, 1.5), rng, 2);

  // Distant boats/structures
  for (let i = 0; i < 2; i++) {
    const bx = 50 + Math.floor(rng() * 220);
    buf.fillRect(bx, 65, 6, 3, darken(ground, 0.3)[0], darken(ground, 0.3)[1], darken(ground, 0.3)[2]);
    buf.vLine(bx + 3, 58, 65, darken(ground, 0.3));
  }

  // Foam line
  for (let x = 0; x < WIDTH; x++) {
    const fy = 70 + Math.round(Math.sin(x * 0.05 + rng() * 6) * 2);
    buf.setPixel(x, fy, 200, 230, 255, 180);
  }
}

function renderIce(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const wall = hexToRgb(zone.wall);
  const accent = hexToRgb(zone.accent);

  // Dark cavern sky
  buf.vertGradient(0, 60, wall, bg);
  buf.vertGradient(60, HEIGHT, bg, darken(ground, 0.2));

  // Stalactites from ceiling
  for (let i = 0; i < 15; i++) {
    const sx = Math.floor(rng() * WIDTH);
    const sh = 10 + Math.floor(rng() * 25);
    const sw = 2 + Math.floor(rng() * 3);
    for (let dy = 0; dy < sh; dy++) {
      const w = Math.max(1, Math.floor(sw * (1 - dy / sh)));
      buf.hLine(sx - w, sx + w, dy, brighten(ground, 0.7 + 0.3 * (1 - dy / sh)));
    }
  }

  // Ice floor
  const iceFloor = terrainLine(WIDTH, 145, 8, rng);
  fillBelowTerrain(buf, iceFloor, ground);
  const deepFloor = terrainLine(WIDTH, 160, 5, rng);
  fillBelowTerrain(buf, deepFloor, darken(ground, 0.2));

  // Crystals
  for (let i = 0; i < 8; i++) {
    const cx = Math.floor(rng() * WIDTH);
    const cy = iceFloor[cx];
    drawCrystal(buf, cx, cy, accent, 6 + Math.floor(rng() * 8));
  }

  // Sparkles
  scatterDots(buf, 25, 10, 140, brighten(accent, 1.5), rng);
}

function renderVolcanic(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const wall = hexToRgb(zone.wall);
  const accent = hexToRgb(zone.accent);

  // Dark smoky sky
  buf.vertGradient(0, 50, [30, 10, 5], bg);
  buf.vertGradient(50, HEIGHT, bg, wall);

  // Volcanic mountains
  drawMountain(buf, 100, 140, 80, darken(ground, 0.2));
  drawMountain(buf, 220, 130, 100, darken(ground, 0.3));
  drawMountain(buf, 160, 135, 120, ground);

  // Lava glow at peaks
  buf.fillCircle(160, 90, 4, accent, 100);
  buf.fillCircle(160, 90, 2, brighten(accent, 1.5), 160);

  // Lava river at bottom
  drawLava(buf, 155, accent, brighten(accent, 1.5), rng);

  // Ground
  const terrain = terrainLine(WIDTH, 150, 8, rng);
  fillBelowTerrain(buf, terrain, ground);

  // Embers / sparks
  scatterDots(buf, 30, 20, 150, accent, rng);
  scatterDots(buf, 10, 20, 100, brighten(accent, 1.5), rng);

  // Smoke wisps
  for (let i = 0; i < 5; i++) {
    const sx = 140 + Math.floor(rng() * 40);
    const sy = 50 + Math.floor(rng() * 30);
    buf.setPixel(sx, sy, 80, 60, 50, 60);
    buf.setPixel(sx + 1, sy - 1, 80, 60, 50, 40);
  }
}

function renderSwamp(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const wall = hexToRgb(zone.wall);
  const accent = hexToRgb(zone.accent);

  // Murky sky
  buf.vertGradient(0, 80, [15, 25, 12], [20, 35, 15]);
  buf.vertGradient(80, HEIGHT, [20, 35, 15], bg);

  // Fog layer
  for (let x = 0; x < WIDTH; x++) {
    const fogY = 60 + Math.round(Math.sin(x * 0.02) * 5);
    for (let dy = -3; dy < 3; dy++) {
      buf.setPixel(x, fogY + dy, 40, 60, 35, 30 - Math.abs(dy) * 8);
    }
  }

  // Swamp water
  buf.fillRect(0, 130, WIDTH, 50, darken(ground, 0.3)[0], darken(ground, 0.3)[1], darken(ground, 0.3)[2]);
  drawWaves(buf, 128, darken(accent, 0.3), rng, 2);

  // Mangrove trees
  const trunkColor = [40, 30, 15];
  for (let i = 0; i < 8; i++) {
    const tx = Math.floor(rng() * WIDTH);
    const ty = 125 + Math.floor(rng() * 10);
    // Roots
    buf.vLine(tx, ty, ty + 8, trunkColor);
    buf.vLine(tx - 2, ty + 3, ty + 8, trunkColor);
    buf.vLine(tx + 2, ty + 3, ty + 8, trunkColor);
    // Trunk up
    buf.vLine(tx, ty - 20, ty, trunkColor);
    // Canopy
    buf.fillCircle(tx, ty - 22, 5, darken(accent, 0.3), 200);
    buf.fillCircle(tx - 3, ty - 20, 4, darken(accent, 0.4), 180);
  }

  // Fireflies
  scatterDots(buf, 12, 40, 125, accent, rng);

  // Lily pads
  for (let i = 0; i < 6; i++) {
    const lx = Math.floor(rng() * WIDTH);
    const ly = 132 + Math.floor(rng() * 15);
    buf.fillRect(lx, ly, 3, 1, accent[0], accent[1], accent[2], 150);
  }
}

function renderMountainIce(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Cold sky
  buf.vertGradient(0, 80, [10, 20, 45], bg);
  buf.vertGradient(80, HEIGHT, bg, darken(ground, 0.2));

  // Snow mountains
  const snowColor = brighten(accent, 1.2);
  drawMountain(buf, 60, 150, 80, darken(ground, 0.3), snowColor);
  drawMountain(buf, 180, 140, 120, darken(ground, 0.2), snowColor);
  drawMountain(buf, 280, 155, 70, darken(ground, 0.35), snowColor);

  // Main peak
  drawMountain(buf, 160, 135, 140, ground, snowColor);

  // Snow ground
  const terrain = terrainLine(WIDTH, 150, 6, rng);
  fillBelowTerrain(buf, terrain, ground);

  // Blizzard particles
  scatterDots(buf, 40, 0, HEIGHT, brighten(accent, 1.5), rng);

  // Stars in sky
  scatterDots(buf, 15, 0, 50, [200, 220, 255], rng);
}

function renderCelestial(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Deep space gradient
  buf.vertGradient(0, HEIGHT, [3, 5, 20], bg);

  // Stars
  for (let i = 0; i < 60; i++) {
    const sx = Math.floor(rng() * WIDTH);
    const sy = Math.floor(rng() * 120);
    drawStar(buf, sx, sy, [180, 200, 255], rng() > 0.7 ? 2 : 1);
  }

  // Spire structure (central)
  const spireX = 160;
  // Spire body
  for (let y = 30; y < 160; y++) {
    const w = Math.max(2, Math.floor(8 - (y < 80 ? (80 - y) * 0.12 : 0)));
    buf.hLine(spireX - w, spireX + w, y, ground);
  }
  // Spire tip
  for (let y = 10; y < 30; y++) {
    const w = Math.max(0, Math.floor((y - 10) * 0.2));
    buf.hLine(spireX - w, spireX + w, y, accent);
  }
  // Glowing orb at top
  buf.fillCircle(spireX, 10, 4, accent, 200);
  buf.fillCircle(spireX, 10, 2, brighten(accent, 1.5), 255);

  // Floating platforms
  for (let i = 0; i < 5; i++) {
    const px = 30 + Math.floor(rng() * 260);
    const py = 80 + Math.floor(rng() * 60);
    buf.fillRect(px, py, 12 + Math.floor(rng() * 8), 3, ground[0], ground[1], ground[2]);
    buf.hLine(px + 1, px + 10, py - 1, accent, 80);
  }

  // Ground platform
  buf.fillRect(0, 155, WIDTH, 25, ground[0], ground[1], ground[2]);
  buf.hLine(0, WIDTH - 1, 154, accent, 120);
}

function renderDeepSea(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Deep water gradient
  buf.vertGradient(0, HEIGHT, [0, 8, 18], bg);

  // Underwater terrain
  const seabed = terrainLine(WIDTH, 150, 12, rng);
  fillBelowTerrain(buf, seabed, ground);
  const deepbed = terrainLine(WIDTH, 165, 5, rng);
  fillBelowTerrain(buf, deepbed, darken(ground, 0.3));

  // Coral / sea plants
  for (let i = 0; i < 10; i++) {
    const cx = Math.floor(rng() * WIDTH);
    const cy = seabed[cx];
    const h = 8 + Math.floor(rng() * 12);
    for (let dy = 0; dy < h; dy++) {
      const sway = Math.round(Math.sin(dy * 0.5) * 1.5);
      buf.setPixel(cx + sway, cy - dy, accent[0], accent[1], accent[2], 150 + Math.floor(rng() * 105));
    }
  }

  // Bubbles
  scatterDots(buf, 20, 20, 145, brighten(accent, 1.5), rng);

  // Bioluminescent particles
  scatterDots(buf, 15, 30, 140, accent, rng, [1, 2]);

  // Light rays from above
  for (let i = 0; i < 3; i++) {
    const rx = 40 + Math.floor(rng() * 240);
    for (let y = 0; y < 80; y++) {
      const x = rx + Math.floor(y * 0.3 * (i % 2 === 0 ? 1 : -1));
      buf.setPixel(x, y, accent[0], accent[1], accent[2], 20 - Math.floor(y * 0.2));
    }
  }
}

function renderWasteland(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Hazy sky
  buf.vertGradient(0, 80, [40, 25, 10], bg);
  buf.vertGradient(80, HEIGHT, bg, darken(ground, 0.3));

  // Terrain
  const terrain = terrainLine(WIDTH, 135, 15, rng);
  fillBelowTerrain(buf, terrain, ground);
  const subterrain = terrainLine(WIDTH, 160, 8, rng);
  fillBelowTerrain(buf, subterrain, darken(ground, 0.3));

  // Dragon bones (ribs)
  for (let i = 0; i < 3; i++) {
    const bx = 60 + Math.floor(rng() * 200);
    const by = terrain[Math.min(bx, WIDTH - 1)];
    // Rib curves
    for (let t = 0; t < 20; t++) {
      const x = bx + Math.round(Math.sin(t * 0.3) * 8);
      const y = by - t;
      buf.setPixel(x, y, 200, 190, 160);
      buf.setPixel(x + 1, y, 180, 170, 140);
    }
  }

  // Skull shape
  const skx = 160, sky = terrain[160] - 2;
  buf.fillCircle(skx, sky - 8, 6, [200, 190, 160]);
  buf.setPixel(skx - 2, sky - 9, 40, 30, 20);
  buf.setPixel(skx + 2, sky - 9, 40, 30, 20);

  // Ash particles
  scatterDots(buf, 25, 10, 130, [120, 100, 70], rng);
  // Ember glow
  scatterDots(buf, 10, 40, 130, accent, rng);
}

function renderVoid(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  buf.fill(bg[0], bg[1], bg[2]);

  // Void fractures
  for (let i = 0; i < 8; i++) {
    let x = Math.floor(rng() * WIDTH);
    let y = Math.floor(rng() * HEIGHT);
    for (let s = 0; s < 30; s++) {
      buf.setPixel(x, y, accent[0], accent[1], accent[2], 60 + Math.floor(rng() * 120));
      x += Math.floor(rng() * 3) - 1;
      y += Math.floor(rng() * 3) - 1;
    }
  }

  // Floating platforms in void
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(rng() * (WIDTH - 20));
    const py = 40 + Math.floor(rng() * 100);
    const pw = 10 + Math.floor(rng() * 20);
    buf.fillRect(px, py, pw, 3, ground[0], ground[1], ground[2]);
    buf.hLine(px, px + pw - 1, py - 1, accent, 60);
    // Dripping void
    for (let d = 0; d < 3; d++) {
      const dx = px + Math.floor(rng() * pw);
      buf.vLine(dx, py + 3, py + 3 + Math.floor(rng() * 8), darken(accent, 0.5), 80);
    }
  }

  // Central void portal
  const cx = 160, cy = 80;
  for (let r = 15; r > 0; r--) {
    const a = Math.floor(40 + (15 - r) * 12);
    buf.fillCircle(cx, cy, r, accent, Math.min(255, a));
  }
  buf.fillCircle(cx, cy, 5, bg);

  // Particles
  scatterDots(buf, 30, 0, HEIGHT, accent, rng);
}

function renderEclipse(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Dark sky with corona
  buf.fill(bg[0], bg[1], bg[2]);

  // Eclipse (dark circle with glowing ring)
  const ex = 160, ey = 50;
  buf.fillCircle(ex, ey, 18, accent, 30);
  buf.fillCircle(ex, ey, 14, accent, 60);
  buf.fillCircle(ex, ey, 12, [5, 3, 0]);
  // Corona rays
  for (let a = 0; a < Math.PI * 2; a += 0.3) {
    for (let r = 14; r < 22; r++) {
      const rx = ex + Math.round(Math.cos(a) * r);
      const ry = ey + Math.round(Math.sin(a) * r);
      buf.setPixel(rx, ry, accent[0], accent[1], accent[2], 60 + Math.floor(rng() * 80));
    }
  }

  // Throne structure
  const tx = 160;
  buf.fillRect(tx - 20, 110, 40, 5, ground[0], ground[1], ground[2]);
  // Steps
  buf.fillRect(tx - 25, 115, 50, 3, ground[0], ground[1], ground[2]);
  buf.fillRect(tx - 30, 118, 60, 3, ground[0], ground[1], ground[2]);
  // Pillars
  buf.fillRect(tx - 18, 80, 3, 30, darken(ground, 0.2)[0], darken(ground, 0.2)[1], darken(ground, 0.2)[2]);
  buf.fillRect(tx + 15, 80, 3, 30, darken(ground, 0.2)[0], darken(ground, 0.2)[1], darken(ground, 0.2)[2]);
  // Throne back
  buf.fillRect(tx - 5, 95, 10, 15, ground[0], ground[1], ground[2]);
  buf.fillRect(tx - 7, 90, 14, 5, ground[0], ground[1], ground[2]);

  // Ground
  buf.fillRect(0, 155, WIDTH, 25, darken(ground, 0.3)[0], darken(ground, 0.3)[1], darken(ground, 0.3)[2]);

  // Embers
  scatterDots(buf, 20, 60, 155, accent, rng);
}

function renderShattered(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  buf.fill(bg[0], bg[1], bg[2]);

  // Shattered ground platforms at various angles
  for (let i = 0; i < 10; i++) {
    const px = Math.floor(rng() * WIDTH);
    const py = 30 + Math.floor(rng() * 120);
    const pw = 15 + Math.floor(rng() * 30);
    const ph = 3 + Math.floor(rng() * 4);
    const tilt = Math.floor(rng() * 5) - 2;
    for (let dx = 0; dx < pw; dx++) {
      const dy = Math.floor(dx * tilt / pw);
      for (let dh = 0; dh < ph; dh++) {
        buf.setPixel(px + dx, py + dy + dh, ground[0], ground[1], ground[2]);
      }
    }
  }

  // Rift cracks (glowing)
  for (let i = 0; i < 5; i++) {
    let x = Math.floor(rng() * WIDTH);
    let y = Math.floor(rng() * HEIGHT);
    for (let s = 0; s < 40; s++) {
      buf.setPixel(x, y, accent[0], accent[1], accent[2], 100 + Math.floor(rng() * 155));
      buf.setPixel(x + 1, y, accent[0], accent[1], accent[2], 50);
      x += Math.floor(rng() * 3) - 1;
      y += 1;
    }
  }

  // Floating debris
  scatterDots(buf, 20, 0, HEIGHT, ground, rng, [1, 3]);
  scatterDots(buf, 15, 0, HEIGHT, accent, rng);
}

function renderCore(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Molten gradient
  buf.vertGradient(0, 90, bg, darken(accent, 0.7));
  buf.vertGradient(90, HEIGHT, darken(accent, 0.7), bg);

  // Central core orb
  const cx = 160, cy = 85;
  buf.fillCircle(cx, cy, 25, darken(accent, 0.5), 80);
  buf.fillCircle(cx, cy, 18, accent, 120);
  buf.fillCircle(cx, cy, 10, brighten(accent, 1.5), 180);
  buf.fillCircle(cx, cy, 5, [255, 200, 100], 220);

  // Energy rings
  for (let a = 0; a < Math.PI * 2; a += 0.08) {
    const r = 30 + Math.sin(a * 3) * 5;
    const rx = cx + Math.round(Math.cos(a) * r);
    const ry = cy + Math.round(Math.sin(a) * r * 0.4);
    buf.setPixel(rx, ry, accent[0], accent[1], accent[2], 150);
  }

  // Crystallized platforms
  for (let i = 0; i < 4; i++) {
    const px = Math.floor(rng() * WIDTH);
    const py = 140 + Math.floor(rng() * 20);
    buf.fillRect(px, py, 20 + Math.floor(rng() * 15), 4, ground[0], ground[1], ground[2]);
    drawCrystal(buf, px + 10, py, accent, 8);
  }

  // Sparks
  scatterDots(buf, 35, 0, HEIGHT, accent, rng);
  scatterDots(buf, 15, 60, 110, brighten(accent, 1.5), rng);
}

function renderEthereal(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Ethereal gradient
  buf.vertGradient(0, HEIGHT, bg, [3, 8, 25]);

  // Nexus conduits (vertical energy lines)
  for (let i = 0; i < 6; i++) {
    const lx = 30 + Math.floor(rng() * 260);
    for (let y = 0; y < HEIGHT; y++) {
      const sway = Math.round(Math.sin(y * 0.1 + i) * 3);
      buf.setPixel(lx + sway, y, accent[0], accent[1], accent[2], 20 + Math.floor(rng() * 40));
    }
  }

  // Central nexus node
  const cx = 160, cy = 85;
  buf.fillCircle(cx, cy, 12, accent, 60);
  buf.fillCircle(cx, cy, 6, brighten(accent, 1.3), 150);
  buf.fillCircle(cx, cy, 3, [200, 240, 255], 220);

  // Crystalline platforms
  for (let i = 0; i < 5; i++) {
    const px = Math.floor(rng() * (WIDTH - 25));
    const py = 50 + Math.floor(rng() * 80);
    const pw = 10 + Math.floor(rng() * 15);
    buf.fillRect(px, py, pw, 2, ground[0], ground[1], ground[2]);
    buf.hLine(px, px + pw, py - 1, accent, 40);
  }

  // Ground
  buf.fillRect(0, 158, WIDTH, 22, ground[0], ground[1], ground[2]);
  buf.hLine(0, WIDTH, 157, accent, 80);

  // Particles
  scatterDots(buf, 40, 0, 155, accent, rng);
  // Stars
  scatterDots(buf, 20, 0, 60, [150, 180, 220], rng);
}

function renderTwilight(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Twilight sky (purple to amber)
  buf.vertGradient(0, 50, [15, 5, 25], [40, 15, 50]);
  buf.vertGradient(50, 90, [40, 15, 50], bg);
  buf.vertGradient(90, HEIGHT, bg, darken(ground, 0.3));

  // Stars
  scatterDots(buf, 20, 0, 50, [200, 180, 220], rng);

  // Citadel silhouette
  const cx = 160;
  // Main tower
  buf.fillRect(cx - 8, 40, 16, 100, ground[0], ground[1], ground[2]);
  buf.fillRect(cx - 4, 25, 8, 15, ground[0], ground[1], ground[2]);
  // Spire
  for (let y = 15; y < 25; y++) {
    const w = Math.max(0, Math.floor((y - 15) * 0.4));
    buf.hLine(cx - w, cx + w, y, ground);
  }
  // Side towers
  buf.fillRect(cx - 35, 60, 10, 80, darken(ground, 0.2)[0], darken(ground, 0.2)[1], darken(ground, 0.2)[2]);
  buf.fillRect(cx + 25, 65, 10, 75, darken(ground, 0.2)[0], darken(ground, 0.2)[1], darken(ground, 0.2)[2]);
  // Battlements
  for (let i = -3; i <= 3; i++) {
    buf.fillRect(cx + i * 5 - 1, 38, 3, 4, ground[0], ground[1], ground[2]);
  }
  // Windows (glowing)
  buf.fillRect(cx - 2, 50, 4, 6, accent[0], accent[1], accent[2], 200);
  buf.fillRect(cx - 2, 70, 4, 6, accent[0], accent[1], accent[2], 200);
  buf.fillRect(cx - 2, 90, 4, 6, accent[0], accent[1], accent[2], 200);

  // Ground
  buf.fillRect(0, 140, WIDTH, 40, darken(ground, 0.3)[0], darken(ground, 0.3)[1], darken(ground, 0.3)[2]);

  // Ambient particles
  scatterDots(buf, 15, 30, 140, accent, rng);
}

function renderOblivion(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Void sky
  buf.fill(bg[0], bg[1], bg[2]);

  // Stars
  for (let i = 0; i < 50; i++) {
    drawStar(buf, Math.floor(rng() * WIDTH), Math.floor(rng() * HEIGHT), [120, 130, 160], rng() > 0.8 ? 2 : 1);
  }

  // Spire structure (central, tall)
  const sx = 160;
  for (let y = 20; y < 165; y++) {
    const w = Math.max(1, Math.floor(4 + Math.sin(y * 0.05) * 2));
    buf.hLine(sx - w, sx + w, y, ground);
  }
  // Spire crown
  for (let y = 5; y < 20; y++) {
    const w = Math.max(0, Math.floor((y - 5) * 0.3));
    buf.hLine(sx - w, sx + w, y, accent);
  }
  // Void-gold glow
  buf.fillCircle(sx, 5, 5, accent, 120);
  buf.fillCircle(sx, 5, 3, brighten(accent, 1.3), 200);

  // Floating fractured platforms
  for (let i = 0; i < 6; i++) {
    const px = Math.floor(rng() * WIDTH);
    const py = 50 + Math.floor(rng() * 90);
    const pw = 8 + Math.floor(rng() * 18);
    buf.fillRect(px, py, pw, 2, ground[0], ground[1], ground[2]);
    // Void drip
    buf.vLine(px + Math.floor(pw / 2), py + 2, py + 5 + Math.floor(rng() * 5), darken(accent, 0.5), 60);
  }

  // Energy lines connecting to spire
  for (let i = 0; i < 4; i++) {
    const startX = Math.floor(rng() * WIDTH);
    const startY = 40 + Math.floor(rng() * 80);
    const steps = 20;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const mx = Math.round(startX + (sx - startX) * t);
      const my = Math.round(startY + (20 - startY) * t);
      buf.setPixel(mx, my, accent[0], accent[1], accent[2], 30 + Math.floor(t * 60));
    }
  }

  scatterDots(buf, 20, 0, HEIGHT, accent, rng);
}

function renderAstral(buf, zone, rng) {
  const bg = hexToRgb(zone.bg);
  const ground = hexToRgb(zone.ground);
  const accent = hexToRgb(zone.accent);

  // Deep space gradient
  buf.vertGradient(0, HEIGHT, [2, 2, 14], bg);

  // Single-pixel starfield (no size-2 crosses that create circle artifacts)
  for (let i = 0; i < 100; i++) {
    const sx = Math.floor(rng() * WIDTH);
    const sy = Math.floor(rng() * HEIGHT);
    const bright = 80 + Math.floor(rng() * 175);
    buf.setPixel(sx, sy, bright, bright, Math.min(255, bright + 30));
  }
  // A few brighter stars with a subtle glow pixel
  for (let i = 0; i < 8; i++) {
    const sx = Math.floor(rng() * WIDTH);
    const sy = Math.floor(rng() * HEIGHT);
    buf.setPixel(sx, sy, 255, 255, 255);
    buf.setPixel(sx + 1, sy, 150, 160, 200, 80);
    buf.setPixel(sx - 1, sy, 150, 160, 200, 80);
    buf.setPixel(sx, sy + 1, 150, 160, 200, 80);
    buf.setPixel(sx, sy - 1, 150, 160, 200, 80);
  }

  // Subtle color wash (no circular shapes — horizontal bands)
  for (let y = 0; y < HEIGHT; y++) {
    const intensity = Math.sin(y * 0.035) * 6;
    if (intensity > 0) {
      for (let x = 0; x < WIDTH; x++) {
        buf.setPixel(x, y, accent[0], accent[1], accent[2], Math.floor(intensity));
      }
    }
  }

  // Pinnacle platform (crystalline, lower half)
  const cx = 160, cy = 135;
  // Platform base
  for (let dy = 0; dy < 6; dy++) {
    const w = 22 - dy * 2;
    buf.hLine(cx - w, cx + w, cy + dy, ground);
  }
  // Main crystal spire
  drawCrystal(buf, cx, cy, accent, 22);
  drawCrystal(buf, cx - 14, cy + 2, darken(accent, 0.2), 10);
  drawCrystal(buf, cx + 16, cy + 1, darken(accent, 0.2), 12);

  // Floating smaller crystals in lower area
  for (let i = 0; i < 4; i++) {
    const fx = 20 + Math.floor(rng() * 280);
    const fy = 115 + Math.floor(rng() * 45);
    drawCrystal(buf, fx, fy, darken(accent, 0.3), 3 + Math.floor(rng() * 3));
  }

  // Accent particles (single pixels, no circles)
  for (let i = 0; i < 20; i++) {
    const px = Math.floor(rng() * WIDTH);
    const py = Math.floor(rng() * HEIGHT);
    buf.setPixel(px, py, accent[0], accent[1], accent[2], 60 + Math.floor(rng() * 100));
  }
}

// ── Biome Renderer Map ───────────────────────────────────────────────────────
const RENDERERS = {
  forest: renderForest,
  desert: renderDesert,
  dungeon: renderDungeon,
  coastal: renderCoastal,
  ice: renderIce,
  volcanic: renderVolcanic,
  swamp: renderSwamp,
  mountain_ice: renderMountainIce,
  celestial: renderCelestial,
  deep_sea: renderDeepSea,
  wasteland: renderWasteland,
  void: renderVoid,
  eclipse: renderEclipse,
  shattered: renderShattered,
  core: renderCore,
  ethereal: renderEthereal,
  twilight: renderTwilight,
  oblivion: renderOblivion,
  astral: renderAstral,
};

// ── Text Overlay ─────────────────────────────────────────────────────────────

function drawTextOverlay(buf, zone) {
  const accent = hexToRgb(zone.accent);
  const textWhite = [240, 240, 240];
  const textShadow = [10, 10, 10];

  // Zone name (large, 2x scale)
  const nameY = 70;
  // Shadow
  buf.drawTextCentered(zone.name, nameY + 1, textShadow, 2);
  buf.drawTextCentered(zone.name, nameY, textWhite, 2);

  // Level range subtitle (1x scale)
  const subText = `LV ${zone.levelRange}`;
  const subY = nameY + 18;
  buf.drawTextCentered(subText, subY + 1, textShadow, 1);
  buf.drawTextCentered(subText, subY, accent, 1);

  // Thin accent line under text
  const lineW = buf.measureText(zone.name, 2);
  const lineX = Math.floor((WIDTH - lineW) / 2);
  buf.hLine(lineX, lineX + lineW, nameY + 16, accent, 100);
}

// ── Subtle vignette border ───────────────────────────────────────────────────
function drawVignette(buf) {
  // Top and bottom darkening strips
  for (let y = 0; y < 6; y++) {
    const a = Math.floor(60 * (1 - y / 6));
    for (let x = 0; x < WIDTH; x++) {
      buf.setPixel(x, y, 0, 0, 0, a);
      buf.setPixel(x, HEIGHT - 1 - y, 0, 0, 0, a);
    }
  }
  // Left and right
  for (let x = 0; x < 4; x++) {
    const a = Math.floor(40 * (1 - x / 4));
    for (let y = 0; y < HEIGHT; y++) {
      buf.setPixel(x, y, 0, 0, 0, a);
      buf.setPixel(WIDTH - 1 - x, y, 0, 0, 0, a);
    }
  }
}

// ── Main Generation Loop ─────────────────────────────────────────────────────

async function generateAll() {
  mkdirSync(OUT_DIR, { recursive: true });

  for (const zone of ZONES) {
    const buf = new PixelBuffer(WIDTH, HEIGHT);
    const rng = mulberry32(zone.id * 31337);

    // Render biome scene
    const renderer = RENDERERS[zone.biome];
    if (!renderer) {
      console.error(`No renderer for biome: ${zone.biome} (zone ${zone.id})`);
      continue;
    }
    renderer(buf, zone, rng);

    // Text overlay
    drawTextOverlay(buf, zone);

    // Vignette
    drawVignette(buf);

    // Write PNG
    const slug = zone.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '');
    const filename = `bg_loading_zone${zone.id}_${slug}.png`;
    const outPath = join(OUT_DIR, filename);

    await sharp(buf.data, { raw: { width: WIDTH, height: HEIGHT, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    console.log(`  [${zone.id}/19] ${filename}`);
  }

  console.log('\nDone! Generated 19 zone loading screens.');
}

generateAll().catch(err => {
  console.error('Generation failed:', err);
  process.exit(1);
});
