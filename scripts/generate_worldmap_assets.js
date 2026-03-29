#!/usr/bin/env node
/**
 * Generate world map & waystone navigation art assets for PixelRealm.
 * Uses only the 32-color master palette from palette-swatches.svg.
 * All assets are pixel art PNGs at 1:1 game resolution (Phaser scales ×3 at runtime).
 *
 * NO EXTERNAL DEPENDENCIES — uses raw PNG encoding with Node.js built-in zlib.
 *
 * Output: public/assets/worldmap/
 *   - worldmap_bg.png              (320×180 world map background)
 *   - waystone_inactive.png        (16×16 waystone sprite — dormant)
 *   - waystone_active.png          (16×16 waystone sprite — activated)
 *   - waystone_teleport.png        (96×16 6-frame teleport animation sheet)
 *   - icon_zone_forest.png         (16×16 map icon)
 *   - icon_zone_desert.png         (16×16 map icon)
 *   - icon_zone_dungeon.png        (16×16 map icon)
 *   - icon_zone_ocean.png          (16×16 map icon)
 *   - icon_zone_ice.png            (16×16 map icon)
 *   - icon_zone_volcanic.png       (16×16 map icon)
 *   - icon_zone_swamp.png          (16×16 map icon)
 *   - icon_zone_astral.png         (16×16 map icon)
 *   - icon_zone_eclipsed.png       (16×16 map icon)
 *   - icon_zone_ethereal.png       (16×16 map icon)
 *   - icon_zone_oblivion.png       (16×16 map icon)
 *   - icon_city.png                (16×16 map icon)
 *   - icon_dungeon.png             (16×16 map icon)
 *   - icon_boss.png                (16×16 map icon)
 *   - icon_poi.png                 (16×16 map icon)
 *   - ui_panel_fasttravel.png      (160×96 fast-travel panel background)
 *   - ui_btn_fasttravel.png        (48×16 fast-travel confirm button)
 *   - ui_btn_fasttravel_disabled.png (48×16 disabled state)
 *   - fog_tile.png                 (16×16 fog-of-war tile)
 *   - fog_edge_n.png               (16×16 fog edge — north)
 *   - fog_edge_s.png               (16×16 fog edge — south)
 *   - fog_edge_e.png               (16×16 fog edge — east)
 *   - fog_edge_w.png               (16×16 fog edge — west)
 *   - fog_corner_ne.png            (16×16 fog corner)
 *   - fog_corner_nw.png            (16×16 fog corner)
 *   - fog_corner_se.png            (16×16 fog corner)
 *   - fog_corner_sw.png            (16×16 fog corner)
 *   - marker_player.png            (16×16 player position marker)
 *   - marker_player_anim.png       (96×16 6-frame pulsing animation)
 *   - marker_path.png              (16×16 path dot indicator)
 *   - marker_path_arrow.png        (16×16 directional path arrow)
 *   - marker_quest.png             (16×16 quest destination marker)
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
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const rowLen = width * 4 + 1;
  const raw = Buffer.alloc(height * rowLen);
  for (let y = 0; y < height; y++) {
    raw[y * rowLen] = 0;
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

// ── Canvas helper ───────────────────────────────────────────────────────────

function createCanvas(w, h) {
  const buf = Buffer.alloc(w * h * 4, 0);
  return {
    width: w, height: h, buf,
    setPixel(x, y, r, g, b, a = 255) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || x >= w || y < 0 || y >= h) return;
      const i = (y * w + x) * 4;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
    },
    setPixelC(x, y, c, a = 255) {
      this.setPixel(x, y, c[0], c[1], c[2], a);
    },
    fillRect(rx, ry, rw, rh, r, g, b, a = 255) {
      for (let yy = ry; yy < ry + rh; yy++)
        for (let xx = rx; xx < rx + rw; xx++)
          this.setPixel(xx, yy, r, g, b, a);
    },
    fillRectC(rx, ry, rw, rh, c, a = 255) {
      this.fillRect(rx, ry, rw, rh, c[0], c[1], c[2], a);
    },
    save(filePath) {
      fs.writeFileSync(filePath, encodePNG(w, h, buf));
    },
  };
}

// ── Master Palette (32 colors) ──────────────────────────────────────────────
const P = {
  black:       [0x0d, 0x0d, 0x0d],
  darkGray:    [0x2b, 0x2b, 0x2b],
  midGray:     [0x4a, 0x4a, 0x4a],
  gray:        [0x6e, 0x6e, 0x6e],
  lightGray:   [0x96, 0x96, 0x96],
  silver:      [0xc8, 0xc8, 0xc8],
  white:       [0xf0, 0xf0, 0xf0],
  darkBrown:   [0x3b, 0x20, 0x10],
  brown:       [0x6b, 0x3a, 0x1f],
  midBrown:    [0x8b, 0x5c, 0x2a],
  tan:         [0xb8, 0x84, 0x3f],
  sand:        [0xd4, 0xa8, 0x5a],
  cream:       [0xe8, 0xd0, 0x8a],
  darkGreen:   [0x1a, 0x3a, 0x1a],
  green:       [0x2d, 0x6e, 0x2d],
  midGreen:    [0x4c, 0x9b, 0x4c],
  lightGreen:  [0x78, 0xc8, 0x78],
  paleGreen:   [0xa8, 0xe4, 0xa0],
  darkNavy:    [0x0a, 0x1a, 0x3a],
  navy:        [0x1a, 0x4a, 0x8a],
  blue:        [0x2a, 0x7a, 0xc0],
  cyan:        [0x50, 0xa8, 0xe8],
  lightCyan:   [0x90, 0xd0, 0xf8],
  paleCyan:    [0xc8, 0xf0, 0xff],
  darkRed:     [0x5a, 0x0a, 0x0a],
  red:         [0xa0, 0x10, 0x10],
  brightRed:   [0xd4, 0x20, 0x20],
  orange:      [0xf0, 0x60, 0x20],
  lightOrange: [0xf8, 0xa0, 0x60],
  darkGold:    [0xa8, 0x70, 0x00],
  gold:        [0xe8, 0xb8, 0x00],
  yellow:      [0xff, 0xe0, 0x40],
  paleYellow:  [0xff, 0xf8, 0xa0],
  darkPurple:  [0x1a, 0x0a, 0x3a],
  purple:      [0x5a, 0x20, 0xa0],
  midPurple:   [0x90, 0x50, 0xe0],
  lightPurple: [0xd0, 0x90, 0xff],
};

// ── Zone biome data ─────────────────────────────────────────────────────────
const ZONES = [
  { id: 'zone1',  key: 'forest',   name: 'Verdant Hollow',     accent: P.midGreen,    bg: P.darkGreen,   ground: P.green },
  { id: 'zone2',  key: 'desert',   name: 'Dusty Trail',        accent: P.lightOrange, bg: P.darkBrown,   ground: P.midBrown },
  { id: 'zone3',  key: 'dungeon',  name: 'Ironveil Ruins',     accent: P.lightPurple, bg: P.darkPurple,  ground: P.midGray },
  { id: 'zone4',  key: 'ocean',    name: 'Saltmarsh Harbor',   accent: P.cyan,        bg: P.darkNavy,    ground: P.navy },
  { id: 'zone5',  key: 'ice',      name: 'Ice Caverns',        accent: P.lightCyan,   bg: P.darkNavy,    ground: P.blue },
  { id: 'zone6',  key: 'volcanic', name: 'Volcanic Highlands', accent: P.orange,      bg: P.darkRed,     ground: P.brightRed },
  { id: 'zone7',  key: 'swamp',    name: 'Swamp Depths',       accent: P.midGreen,    bg: P.darkGreen,   ground: P.darkGreen },
  { id: 'zone8',  key: 'astral',   name: 'Astral Pinnacle',    accent: P.lightCyan,   bg: P.darkNavy,    ground: P.navy },
  { id: 'zone9',  key: 'eclipsed', name: 'Eclipsed Throne',    accent: P.lightPurple, bg: P.darkPurple,  ground: P.purple },
  { id: 'zone10', key: 'ethereal', name: 'Ethereal Nexus',     accent: P.paleCyan,    bg: P.darkNavy,    ground: P.blue },
  { id: 'zone11', key: 'oblivion', name: 'Oblivion Spire',     accent: P.gold,        bg: P.darkGray,    ground: P.midGray },
];

const OUT = path.join(__dirname, '..', 'public', 'assets', 'worldmap');

// ── Utility drawing helpers ─────────────────────────────────────────────────

function mixColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function drawCircle(canvas, cx, cy, r, color, alpha = 255) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r)
        canvas.setPixelC(cx + x, cy + y, color, alpha);
}

function drawDiamond(canvas, cx, cy, r, color, alpha = 255) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (Math.abs(x) + Math.abs(y) <= r)
        canvas.setPixelC(cx + x, cy + y, color, alpha);
}

function drawOutlineRect(canvas, x, y, w, h, color, alpha = 255) {
  for (let i = x; i < x + w; i++) {
    canvas.setPixelC(i, y, color, alpha);
    canvas.setPixelC(i, y + h - 1, color, alpha);
  }
  for (let j = y; j < y + h; j++) {
    canvas.setPixelC(x, j, color, alpha);
    canvas.setPixelC(x + w - 1, j, color, alpha);
  }
}

// Seeded PRNG for deterministic art
let seed = 42;
function rand() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed >> 16) / 32768;
}
function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. WORLD MAP BACKGROUND (320×180)
// ═══════════════════════════════════════════════════════════════════════════

function generateWorldMapBg() {
  const W = 320, H = 180;
  const c = createCanvas(W, H);

  // Dark base
  c.fillRectC(0, 0, W, H, P.black);

  // Starfield background
  seed = 7;
  for (let i = 0; i < 120; i++) {
    const sx = randInt(0, W - 1);
    const sy = randInt(0, H - 1);
    const brightness = rand() > 0.7 ? P.lightGray : P.midGray;
    c.setPixelC(sx, sy, brightness, randInt(80, 200));
  }

  // Draw ocean / water base across lower portion
  for (let y = Math.floor(H * 0.55); y < H; y++) {
    const t = (y - H * 0.55) / (H * 0.45);
    const waterColor = mixColor(P.darkNavy, P.black, t * 0.5);
    for (let x = 0; x < W; x++) {
      c.setPixelC(x, y, waterColor, 180);
    }
  }

  // Zone region blobs — each zone gets a colored region on the map
  const zonePositions = [
    { x: 40,  y: 70,  w: 40, h: 30 },  // Verdant Hollow (forest, top-left)
    { x: 90,  y: 55,  w: 38, h: 25 },  // Dusty Trail (desert, mid-left)
    { x: 140, y: 40,  w: 35, h: 35 },  // Ironveil Ruins (dungeon, center)
    { x: 190, y: 80,  w: 35, h: 30 },  // Saltmarsh Harbor (ocean, right-center)
    { x: 240, y: 35,  w: 35, h: 30 },  // Ice Caverns (ice, top-right)
    { x: 60,  y: 110, w: 30, h: 25 },  // Volcanic Highlands (volcanic, bottom-left)
    { x: 110, y: 100, w: 32, h: 28 },  // Swamp Depths (swamp, bottom-center)
    { x: 175, y: 30,  w: 30, h: 25 },  // Astral Pinnacle (astral, upper-center)
    { x: 240, y: 80,  w: 32, h: 28 },  // Eclipsed Throne (eclipsed, right)
    { x: 280, y: 50,  w: 30, h: 25 },  // Ethereal Nexus (ethereal, far-right)
    { x: 160, y: 120, w: 32, h: 28 },  // Oblivion Spire (oblivion, bottom-center)
  ];

  // Draw zone terrain blobs
  seed = 123;
  for (let zi = 0; zi < ZONES.length; zi++) {
    const zone = ZONES[zi];
    const pos = zonePositions[zi];

    // Organic region shape using random fill
    for (let py = pos.y - 4; py < pos.y + pos.h + 4; py++) {
      for (let px = pos.x - 4; px < pos.x + pos.w + 4; px++) {
        const dx = (px - (pos.x + pos.w / 2)) / (pos.w / 2 + 2);
        const dy = (py - (pos.y + pos.h / 2)) / (pos.h / 2 + 2);
        const dist = dx * dx + dy * dy;
        if (dist < 1.0) {
          const edgeFade = Math.max(0, 1 - dist);
          const noise = rand() * 0.3;
          if (edgeFade + noise > 0.3) {
            const t = edgeFade * 0.7;
            const col = mixColor(zone.bg, zone.ground, t);
            const alpha = Math.round(180 * edgeFade);
            c.setPixelC(px, py, col, alpha);
          }
        }
      }
    }

    // Zone accent border highlight (subtle)
    for (let px = pos.x; px < pos.x + pos.w; px++) {
      if (rand() > 0.4) c.setPixelC(px, pos.y, zone.accent, 60);
      if (rand() > 0.4) c.setPixelC(px, pos.y + pos.h - 1, zone.accent, 60);
    }
    for (let py = pos.y; py < pos.y + pos.h; py++) {
      if (rand() > 0.4) c.setPixelC(pos.x, py, zone.accent, 60);
      if (rand() > 0.4) c.setPixelC(pos.x + pos.w - 1, py, zone.accent, 60);
    }
  }

  // Draw connecting paths between zones (dotted lines)
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4], // main progression
    [0, 5], [5, 6], [6, 10],        // volcanic-swamp-oblivion branch
    [2, 7], [7, 9],                  // astral-ethereal branch
    [4, 8], [8, 9],                  // eclipsed-ethereal branch
  ];

  for (const [a, b] of connections) {
    const pa = zonePositions[a], pb = zonePositions[b];
    const ax = pa.x + pa.w / 2, ay = pa.y + pa.h / 2;
    const bx = pb.x + pb.w / 2, by = pb.y + pb.h / 2;
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const px = Math.round(ax + (bx - ax) * t);
      const py = Math.round(ay + (by - ay) * t);
      if (s % 3 === 0) { // dotted
        c.setPixelC(px, py, P.midGray, 120);
      }
    }
  }

  // Map border frame
  drawOutlineRect(c, 0, 0, W, H, P.darkGray, 200);
  drawOutlineRect(c, 1, 1, W - 2, H - 2, P.midGray, 80);

  // Compass rose in bottom-right (tiny)
  const crx = W - 14, cry = H - 14;
  c.setPixelC(crx, cry - 3, P.silver);  // N
  c.setPixelC(crx, cry - 2, P.silver);
  c.setPixelC(crx, cry + 2, P.gray);    // S
  c.setPixelC(crx, cry + 3, P.gray);
  c.setPixelC(crx - 3, cry, P.gray);    // W
  c.setPixelC(crx - 2, cry, P.gray);
  c.setPixelC(crx + 2, cry, P.gray);    // E
  c.setPixelC(crx + 3, cry, P.gray);
  c.setPixelC(crx, cry, P.lightGray);   // center

  c.save(path.join(OUT, 'worldmap_bg.png'));
  console.log('  ✓ worldmap_bg.png (320×180)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. WAYSTONE / TELEPORT SHRINE SPRITES
// ═══════════════════════════════════════════════════════════════════════════

function generateWaystoneInactive() {
  const c = createCanvas(16, 16);

  // Stone base
  c.fillRectC(5, 12, 6, 3, P.midGray);
  c.fillRectC(4, 14, 8, 2, P.gray);

  // Pillar
  c.fillRectC(6, 4, 4, 8, P.midGray);
  c.fillRectC(7, 3, 2, 1, P.midGray);

  // Stone texture
  c.setPixelC(7, 6, P.darkGray);
  c.setPixelC(8, 8, P.darkGray);
  c.setPixelC(7, 10, P.darkGray);

  // Rune marks (inactive — dark)
  c.setPixelC(7, 5, P.darkPurple);
  c.setPixelC(8, 7, P.darkPurple);
  c.setPixelC(7, 9, P.darkPurple);

  // Capstone
  c.fillRectC(6, 3, 4, 1, P.lightGray);
  c.setPixelC(7, 2, P.lightGray);
  c.setPixelC(8, 2, P.lightGray);

  c.save(path.join(OUT, 'waystone_inactive.png'));
  console.log('  ✓ waystone_inactive.png (16×16)');
}

function generateWaystoneActive() {
  const c = createCanvas(16, 16);

  // Stone base
  c.fillRectC(5, 12, 6, 3, P.midGray);
  c.fillRectC(4, 14, 8, 2, P.gray);

  // Pillar
  c.fillRectC(6, 4, 4, 8, P.midGray);
  c.fillRectC(7, 3, 2, 1, P.midGray);

  // Rune marks (active — glowing cyan)
  c.setPixelC(7, 5, P.cyan);
  c.setPixelC(8, 7, P.lightCyan);
  c.setPixelC(7, 9, P.cyan);

  // Glow aura around runes
  c.setPixelC(6, 5, P.navy, 100);
  c.setPixelC(9, 7, P.navy, 100);
  c.setPixelC(6, 9, P.navy, 100);

  // Capstone with glow
  c.fillRectC(6, 3, 4, 1, P.lightCyan);
  c.setPixelC(7, 2, P.paleCyan);
  c.setPixelC(8, 2, P.paleCyan);

  // Top glow particle
  c.setPixelC(7, 1, P.lightCyan, 150);
  c.setPixelC(8, 1, P.cyan, 100);

  c.save(path.join(OUT, 'waystone_active.png'));
  console.log('  ✓ waystone_active.png (16×16)');
}

function generateWaystoneTeleport() {
  // 6-frame animation sheet (96×16), each 16×16 frame
  const c = createCanvas(96, 16);

  for (let frame = 0; frame < 6; frame++) {
    const ox = frame * 16;
    const t = frame / 5; // 0 to 1 progress

    // Stone base (fading as teleport progresses)
    const baseAlpha = Math.round(255 * (1 - t * 0.5));
    c.fillRectC(ox + 5, 12, 6, 3, P.midGray, baseAlpha);
    c.fillRectC(ox + 4, 14, 8, 2, P.gray, baseAlpha);

    // Pillar
    c.fillRectC(ox + 6, 4, 4, 8, P.midGray, baseAlpha);

    // Runes intensify
    const runeColor = mixColor(P.cyan, P.paleCyan, t);
    c.setPixelC(ox + 7, 5, runeColor);
    c.setPixelC(ox + 8, 7, runeColor);
    c.setPixelC(ox + 7, 9, runeColor);

    // Expanding energy ring
    const ringR = Math.round(2 + t * 4);
    const ringAlpha = Math.round(200 * (1 - t * 0.3));
    for (let a = 0; a < 16; a++) {
      const angle = (a / 16) * Math.PI * 2;
      const rx = Math.round(ox + 8 + Math.cos(angle) * ringR);
      const ry = Math.round(8 + Math.sin(angle) * ringR);
      c.setPixelC(rx, ry, P.lightCyan, ringAlpha);
    }

    // Rising particles (increase with progress)
    const particleCount = Math.round(1 + t * 4);
    for (let p = 0; p < particleCount; p++) {
      const px = ox + 6 + (p * 3 + frame) % 5;
      const py = Math.round(10 - t * 8 - p * 2) % 16;
      if (py >= 0 && py < 16) {
        c.setPixelC(px, py, P.paleCyan, Math.round(180 - p * 30));
      }
    }

    // Flash at final frame
    if (frame === 5) {
      for (let fy = 2; fy < 14; fy++)
        for (let fx = ox + 4; fx < ox + 12; fx++)
          c.setPixelC(fx, fy, P.paleCyan, 100);
    }
  }

  c.save(path.join(OUT, 'waystone_teleport.png'));
  console.log('  ✓ waystone_teleport.png (96×16 — 6 frames)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. MAP ICONS (16×16 each)
// ═══════════════════════════════════════════════════════════════════════════

function generateZoneIcons() {
  const iconDefs = [
    { key: 'forest', draw: drawForestIcon },
    { key: 'desert', draw: drawDesertIcon },
    { key: 'dungeon', draw: drawDungeonZoneIcon },
    { key: 'ocean', draw: drawOceanIcon },
    { key: 'ice', draw: drawIceIcon },
    { key: 'volcanic', draw: drawVolcanicIcon },
    { key: 'swamp', draw: drawSwampIcon },
    { key: 'astral', draw: drawAstralIcon },
    { key: 'eclipsed', draw: drawEclipsedIcon },
    { key: 'ethereal', draw: drawEtherealIcon },
    { key: 'oblivion', draw: drawOblivionIcon },
  ];

  for (const def of iconDefs) {
    const c = createCanvas(16, 16);
    def.draw(c);
    c.save(path.join(OUT, `icon_zone_${def.key}.png`));
    console.log(`  ✓ icon_zone_${def.key}.png (16×16)`);
  }
}

function drawForestIcon(c) {
  // Tree silhouette
  c.fillRectC(7, 12, 2, 3, P.brown);           // trunk
  c.fillRectC(5, 6, 6, 6, P.green);             // canopy
  c.fillRectC(6, 4, 4, 2, P.midGreen);          // top canopy
  c.setPixelC(7, 3, P.midGreen);
  c.setPixelC(8, 3, P.midGreen);
  c.setPixelC(6, 8, P.darkGreen);               // canopy shadow
  c.setPixelC(9, 7, P.lightGreen);              // highlight
}

function drawDesertIcon(c) {
  // Sand dune + cactus
  c.fillRectC(2, 11, 12, 4, P.sand);            // dune base
  c.fillRectC(4, 9, 8, 2, P.tan);               // dune peak
  c.fillRectC(7, 4, 2, 7, P.green);             // cactus stem
  c.fillRectC(5, 6, 2, 2, P.green);             // left arm
  c.fillRectC(9, 5, 2, 2, P.midGreen);          // right arm
  c.setPixelC(8, 4, P.midGreen);                // top
}

function drawDungeonZoneIcon(c) {
  // Stone archway
  c.fillRectC(3, 5, 2, 10, P.midGray);          // left pillar
  c.fillRectC(11, 5, 2, 10, P.midGray);         // right pillar
  c.fillRectC(3, 4, 10, 2, P.lightGray);        // lintel
  c.fillRectC(5, 6, 6, 9, P.darkGray);          // dark entrance
  c.setPixelC(7, 8, P.midPurple);               // rune glow
  c.setPixelC(8, 8, P.midPurple);
  c.setPixelC(4, 6, P.darkGray);                // shadow
}

function drawOceanIcon(c) {
  // Wave + anchor
  c.fillRectC(2, 10, 12, 5, P.navy);            // water base
  // Wave crests
  for (let x = 2; x < 14; x += 3) {
    c.setPixelC(x, 9, P.blue);
    c.setPixelC(x + 1, 8, P.cyan);
  }
  // Anchor
  c.fillRectC(7, 3, 2, 6, P.lightGray);         // shaft
  c.setPixelC(6, 3, P.lightGray);               // crossbar
  c.setPixelC(9, 3, P.lightGray);
  c.setPixelC(5, 8, P.gray);                    // flukes
  c.setPixelC(10, 8, P.gray);
  c.setPixelC(7, 2, P.gray);                    // ring
  c.setPixelC(8, 2, P.gray);
}

function drawIceIcon(c) {
  // Crystal / snowflake shape
  c.setPixelC(7, 3, P.lightCyan); c.setPixelC(8, 3, P.lightCyan);
  c.setPixelC(7, 12, P.lightCyan); c.setPixelC(8, 12, P.lightCyan);
  c.fillRectC(7, 4, 2, 8, P.cyan);              // vertical
  c.fillRectC(4, 7, 8, 2, P.cyan);              // horizontal
  // Diagonal arms
  c.setPixelC(5, 5, P.lightCyan); c.setPixelC(10, 5, P.lightCyan);
  c.setPixelC(5, 10, P.lightCyan); c.setPixelC(10, 10, P.lightCyan);
  c.setPixelC(6, 6, P.paleCyan); c.setPixelC(9, 6, P.paleCyan);
  c.setPixelC(6, 9, P.paleCyan); c.setPixelC(9, 9, P.paleCyan);
  // Center gem
  c.setPixelC(7, 7, P.paleCyan); c.setPixelC(8, 7, P.paleCyan);
  c.setPixelC(7, 8, P.paleCyan); c.setPixelC(8, 8, P.paleCyan);
}

function drawVolcanicIcon(c) {
  // Volcano mountain
  c.fillRectC(3, 12, 10, 3, P.darkBrown);       // base
  c.fillRectC(4, 10, 8, 2, P.brown);            // mid
  c.fillRectC(5, 8, 6, 2, P.midBrown);          // upper
  c.fillRectC(6, 6, 4, 2, P.brown);             // peak sides
  c.fillRectC(7, 5, 2, 1, P.brown);             // tip
  // Crater / lava
  c.setPixelC(7, 5, P.orange);
  c.setPixelC(8, 5, P.brightRed);
  c.setPixelC(7, 6, P.yellow);
  c.setPixelC(8, 6, P.orange);
  // Lava drip
  c.setPixelC(7, 7, P.orange, 180);
  // Smoke
  c.setPixelC(7, 3, P.midGray, 150);
  c.setPixelC(8, 2, P.gray, 100);
}

function drawSwampIcon(c) {
  // Murky water + dead tree
  c.fillRectC(2, 10, 12, 5, P.darkGreen);       // swamp water
  c.fillRectC(3, 11, 10, 1, P.green, 100);      // surface shimmer
  // Dead tree
  c.fillRectC(7, 4, 2, 7, P.darkBrown);         // trunk
  c.setPixelC(5, 5, P.brown);                   // branch left
  c.setPixelC(6, 4, P.brown);
  c.setPixelC(10, 4, P.brown);                  // branch right
  c.setPixelC(9, 5, P.brown);
  // Mushroom
  c.setPixelC(4, 9, P.midGreen);
  c.setPixelC(4, 10, P.green);
}

function drawAstralIcon(c) {
  // Floating island / star cluster
  c.fillRectC(5, 8, 6, 3, P.navy);              // floating island
  c.fillRectC(6, 7, 4, 1, P.blue);              // top
  c.setPixelC(6, 10, P.darkNavy);               // shadow
  c.setPixelC(9, 10, P.darkNavy);
  // Stars
  c.setPixelC(3, 3, P.paleCyan);
  c.setPixelC(11, 4, P.lightCyan);
  c.setPixelC(7, 2, P.paleCyan);
  c.setPixelC(5, 5, P.cyan, 180);
  c.setPixelC(10, 6, P.cyan, 180);
  // Crystal on island
  c.setPixelC(7, 6, P.lightCyan);
  c.setPixelC(8, 6, P.paleCyan);
  c.setPixelC(8, 5, P.lightCyan);
}

function drawEclipsedIcon(c) {
  // Eclipse — dark circle with glowing corona
  drawCircle(c, 8, 7, 4, P.darkGray);
  drawCircle(c, 8, 7, 3, P.black);
  // Corona
  c.setPixelC(4, 4, P.lightPurple); c.setPixelC(12, 4, P.lightPurple);
  c.setPixelC(4, 10, P.midPurple);  c.setPixelC(12, 10, P.midPurple);
  c.setPixelC(3, 7, P.lightPurple); c.setPixelC(13, 7, P.lightPurple);
  c.setPixelC(8, 2, P.midPurple);   c.setPixelC(8, 12, P.midPurple);
  // Inner light crack
  c.setPixelC(7, 7, P.darkPurple);
  c.setPixelC(9, 7, P.purple, 150);
}

function drawEtherealIcon(c) {
  // Nexus portal — swirling circle
  drawCircle(c, 8, 8, 5, P.darkNavy, 150);
  // Ring
  for (let a = 0; a < 20; a++) {
    const angle = (a / 20) * Math.PI * 2;
    const rx = Math.round(8 + Math.cos(angle) * 4);
    const ry = Math.round(8 + Math.sin(angle) * 4);
    c.setPixelC(rx, ry, a % 2 === 0 ? P.cyan : P.lightCyan);
  }
  // Center glow
  c.setPixelC(7, 7, P.paleCyan);
  c.setPixelC(8, 7, P.paleCyan);
  c.setPixelC(7, 8, P.paleCyan);
  c.setPixelC(8, 8, P.paleCyan);
}

function drawOblivionIcon(c) {
  // Dark spire / tower
  c.fillRectC(6, 3, 4, 12, P.darkGray);         // tower
  c.fillRectC(7, 1, 2, 2, P.midGray);           // pinnacle
  c.setPixelC(7, 0, P.gold);                    // beacon
  c.setPixelC(8, 0, P.gold);
  // Window slits
  c.setPixelC(7, 5, P.darkGold);
  c.setPixelC(8, 5, P.darkGold);
  c.setPixelC(7, 8, P.darkGold);
  c.setPixelC(8, 8, P.darkGold);
  c.setPixelC(7, 11, P.darkGold);
  c.setPixelC(8, 11, P.darkGold);
  // Base
  c.fillRectC(5, 14, 6, 2, P.midGray);
}

// ── POI/Type icons ──────────────────────────────────────────────────────────

function generatePoiIcons() {
  // City icon — buildings
  let c = createCanvas(16, 16);
  c.fillRectC(3, 8, 4, 7, P.midGray);           // building 1
  c.fillRectC(8, 6, 5, 9, P.gray);              // building 2
  c.fillRectC(5, 10, 3, 5, P.lightGray);        // building 3
  c.setPixelC(4, 9, P.yellow, 200);             // window
  c.setPixelC(10, 8, P.yellow, 200);
  c.setPixelC(6, 11, P.yellow, 200);
  c.fillRectC(9, 4, 2, 2, P.gray);              // tower top
  c.setPixelC(9, 3, P.lightGray);
  c.setPixelC(10, 3, P.lightGray);
  c.save(path.join(OUT, 'icon_city.png'));
  console.log('  ✓ icon_city.png (16×16)');

  // Dungeon icon — skull entrance
  c = createCanvas(16, 16);
  c.fillRectC(4, 6, 8, 8, P.darkGray);          // cave opening
  c.fillRectC(5, 5, 6, 1, P.midGray);           // lintel
  c.fillRectC(3, 13, 10, 2, P.midGray);         // base
  // Skull shape
  c.fillRectC(6, 7, 4, 3, P.lightGray);         // skull
  c.setPixelC(7, 8, P.black);                   // eye L
  c.setPixelC(8, 8, P.black);                   // eye R
  c.setPixelC(7, 10, P.darkGray);               // teeth
  c.setPixelC(8, 10, P.darkGray);
  c.save(path.join(OUT, 'icon_dungeon.png'));
  console.log('  ✓ icon_dungeon.png (16×16)');

  // Boss icon — crown / horned skull
  c = createCanvas(16, 16);
  // Crown
  c.fillRectC(4, 5, 8, 4, P.gold);
  c.setPixelC(4, 4, P.gold); c.setPixelC(7, 3, P.gold);
  c.setPixelC(8, 3, P.gold); c.setPixelC(11, 4, P.gold);
  c.setPixelC(4, 3, P.yellow); c.setPixelC(11, 3, P.yellow);
  c.setPixelC(7, 2, P.yellow); c.setPixelC(8, 2, P.yellow);
  // Gem
  c.setPixelC(7, 6, P.brightRed);
  c.setPixelC(8, 6, P.brightRed);
  // Skull beneath
  c.fillRectC(5, 9, 6, 4, P.lightGray);
  c.setPixelC(6, 10, P.black); c.setPixelC(9, 10, P.black);
  c.setPixelC(7, 12, P.darkGray); c.setPixelC(8, 12, P.darkGray);
  c.save(path.join(OUT, 'icon_boss.png'));
  console.log('  ✓ icon_boss.png (16×16)');

  // POI icon — exclamation / diamond marker
  c = createCanvas(16, 16);
  drawDiamond(c, 8, 8, 5, P.gold, 200);
  drawDiamond(c, 8, 8, 3, P.yellow);
  c.setPixelC(7, 6, P.white); c.setPixelC(8, 6, P.white);
  c.setPixelC(7, 7, P.white); c.setPixelC(8, 7, P.white);
  c.setPixelC(7, 8, P.white); c.setPixelC(8, 8, P.white);
  c.setPixelC(7, 10, P.white); c.setPixelC(8, 10, P.white);
  c.save(path.join(OUT, 'icon_poi.png'));
  console.log('  ✓ icon_poi.png (16×16)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. FAST-TRAVEL UI PANEL
// ═══════════════════════════════════════════════════════════════════════════

function generateFastTravelPanel() {
  // Panel background (160×96)
  const W = 160, H = 96;
  let c = createCanvas(W, H);

  // Dark semi-transparent panel
  c.fillRectC(0, 0, W, H, P.darkNavy);

  // Inner area slightly lighter
  c.fillRectC(2, 2, W - 4, H - 4, P.black);

  // Border — double line
  drawOutlineRect(c, 0, 0, W, H, P.navy);
  drawOutlineRect(c, 1, 1, W - 2, H - 2, P.blue, 100);

  // Header bar
  c.fillRectC(2, 2, W - 4, 10, P.darkNavy);
  c.fillRectC(2, 11, W - 4, 1, P.blue, 150);

  // Corner accents (cyan dots)
  c.setPixelC(2, 2, P.cyan); c.setPixelC(W - 3, 2, P.cyan);
  c.setPixelC(2, H - 3, P.cyan); c.setPixelC(W - 3, H - 3, P.cyan);

  // Waystone icon hint in header (small rune)
  c.setPixelC(5, 5, P.cyan);
  c.setPixelC(6, 4, P.lightCyan);
  c.setPixelC(6, 6, P.lightCyan);
  c.setPixelC(7, 5, P.cyan);

  // Divider line for zone list area
  for (let x = 4; x < W - 4; x += 2) {
    c.setPixelC(x, 14, P.navy, 100);
  }

  // Zone list area indicators (subtle row lines)
  for (let row = 0; row < 5; row++) {
    const ry = 18 + row * 12;
    c.fillRectC(4, ry, W - 8, 10, P.darkNavy, 60);
    // Selection dot placeholder
    c.setPixelC(6, ry + 4, P.midGray, 120);
  }

  // Bottom button area divider
  for (let x = 4; x < W - 4; x += 2) {
    c.setPixelC(x, H - 18, P.navy, 100);
  }

  c.save(path.join(OUT, 'ui_panel_fasttravel.png'));
  console.log('  ✓ ui_panel_fasttravel.png (160×96)');

  // Button — active (48×16)
  c = createCanvas(48, 16);
  c.fillRectC(0, 0, 48, 16, P.navy);
  c.fillRectC(1, 1, 46, 14, P.blue);
  c.fillRectC(2, 2, 44, 12, P.navy);
  drawOutlineRect(c, 0, 0, 48, 16, P.cyan, 200);
  // "TRAVEL" text hint (pixel dots suggesting text)
  for (let tx = 10; tx < 38; tx += 4) {
    c.setPixelC(tx, 7, P.lightCyan);
    c.setPixelC(tx + 1, 7, P.lightCyan);
  }
  c.save(path.join(OUT, 'ui_btn_fasttravel.png'));
  console.log('  ✓ ui_btn_fasttravel.png (48×16)');

  // Button — disabled (48×16)
  c = createCanvas(48, 16);
  c.fillRectC(0, 0, 48, 16, P.darkGray);
  c.fillRectC(1, 1, 46, 14, P.midGray, 80);
  c.fillRectC(2, 2, 44, 12, P.darkGray);
  drawOutlineRect(c, 0, 0, 48, 16, P.midGray, 120);
  for (let tx = 10; tx < 38; tx += 4) {
    c.setPixelC(tx, 7, P.gray, 120);
    c.setPixelC(tx + 1, 7, P.gray, 120);
  }
  c.save(path.join(OUT, 'ui_btn_fasttravel_disabled.png'));
  console.log('  ✓ ui_btn_fasttravel_disabled.png (48×16)');
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. FOG-OF-WAR TILES (16×16 each)
// ═══════════════════════════════════════════════════════════════════════════

function generateFogTiles() {
  // Full fog tile — solid dark with noise
  let c = createCanvas(16, 16);
  seed = 55;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const noise = randInt(0, 15);
      c.setPixel(x, y, noise, noise, noise + 5, 220);
    }
  c.save(path.join(OUT, 'fog_tile.png'));
  console.log('  ✓ fog_tile.png (16×16)');

  // Edge tiles — fog fading in one direction
  const dirs = [
    { name: 'n', fx: 0, fy: -1 },  // fog from north (opaque at top, transparent at bottom)
    { name: 's', fx: 0, fy: 1 },
    { name: 'e', fx: 1, fy: 0 },
    { name: 'w', fx: -1, fy: 0 },
  ];

  for (const dir of dirs) {
    c = createCanvas(16, 16);
    seed = 77;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        let t; // 0 = transparent, 1 = opaque
        if (dir.fy === -1) t = 1 - y / 15;          // north edge
        else if (dir.fy === 1) t = y / 15;           // south edge
        else if (dir.fx === -1) t = 1 - x / 15;     // west edge
        else t = x / 15;                              // east edge

        const noise = randInt(0, 10);
        const alpha = Math.round(t * 210 + noise);
        c.setPixel(x, y, noise, noise, noise + 3, Math.min(255, alpha));
      }
    c.save(path.join(OUT, `fog_edge_${dir.name}.png`));
    console.log(`  ✓ fog_edge_${dir.name}.png (16×16)`);
  }

  // Corner tiles — fog in a quadrant
  const corners = [
    { name: 'ne', sx: 1, sy: -1 },
    { name: 'nw', sx: -1, sy: -1 },
    { name: 'se', sx: 1, sy: 1 },
    { name: 'sw', sx: -1, sy: 1 },
  ];

  for (const corner of corners) {
    c = createCanvas(16, 16);
    seed = 99;
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        // Distance from the transparent corner
        const nx = corner.sx > 0 ? x / 15 : 1 - x / 15;
        const ny = corner.sy > 0 ? y / 15 : 1 - y / 15;
        const t = Math.min(1, Math.sqrt(nx * nx + ny * ny));

        const noise = randInt(0, 10);
        const alpha = Math.round(t * 200 + noise);
        c.setPixel(x, y, noise, noise, noise + 3, Math.min(255, alpha));
      }
    c.save(path.join(OUT, `fog_corner_${corner.name}.png`));
    console.log(`  ✓ fog_corner_${corner.name}.png (16×16)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. PLAYER MARKER & PATH INDICATORS
// ═══════════════════════════════════════════════════════════════════════════

function generateMarkers() {
  // Player marker — static (16×16)
  let c = createCanvas(16, 16);
  // Downward-pointing triangle (chevron marker)
  c.fillRectC(6, 3, 4, 2, P.gold);
  c.fillRectC(5, 5, 6, 2, P.yellow);
  c.fillRectC(6, 7, 4, 2, P.gold);
  c.fillRectC(7, 9, 2, 2, P.yellow);
  c.setPixelC(7, 11, P.gold);
  c.setPixelC(8, 11, P.gold);
  // Outline accent
  c.setPixelC(5, 4, P.darkGold);
  c.setPixelC(10, 4, P.darkGold);
  // Inner highlight
  c.setPixelC(7, 5, P.paleYellow);
  c.setPixelC(8, 5, P.paleYellow);
  c.save(path.join(OUT, 'marker_player.png'));
  console.log('  ✓ marker_player.png (16×16)');

  // Player marker animation — 6-frame pulse (96×16)
  c = createCanvas(96, 16);
  for (let frame = 0; frame < 6; frame++) {
    const ox = frame * 16;
    const pulse = Math.sin((frame / 6) * Math.PI * 2) * 0.5 + 0.5; // 0–1

    const bodyColor = mixColor(P.gold, P.yellow, pulse);
    const glowAlpha = Math.round(60 + pulse * 120);

    // Glow ring
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2;
      const gr = 5 + pulse * 1.5;
      const gx = Math.round(ox + 8 + Math.cos(angle) * gr);
      const gy = Math.round(8 + Math.sin(angle) * gr);
      c.setPixelC(gx, gy, P.gold, glowAlpha);
    }

    // Chevron marker
    c.fillRectC(ox + 6, 3, 4, 2, bodyColor);
    c.fillRectC(ox + 5, 5, 6, 2, bodyColor);
    c.fillRectC(ox + 6, 7, 4, 2, bodyColor);
    c.fillRectC(ox + 7, 9, 2, 2, bodyColor);
    c.setPixelC(ox + 7, 11, bodyColor);
    c.setPixelC(ox + 8, 11, bodyColor);
    // Highlight
    const hlColor = mixColor(P.yellow, P.paleYellow, pulse);
    c.setPixelC(ox + 7, 5, hlColor);
    c.setPixelC(ox + 8, 5, hlColor);
  }
  c.save(path.join(OUT, 'marker_player_anim.png'));
  console.log('  ✓ marker_player_anim.png (96×16 — 6 frames)');

  // Path dot (16×16)
  c = createCanvas(16, 16);
  drawCircle(c, 8, 8, 2, P.gray, 180);
  c.setPixelC(7, 7, P.lightGray, 200);
  c.setPixelC(8, 7, P.lightGray, 200);
  c.save(path.join(OUT, 'marker_path.png'));
  console.log('  ✓ marker_path.png (16×16)');

  // Path arrow — right-pointing (16×16)
  c = createCanvas(16, 16);
  // Arrow shaft
  c.fillRectC(4, 7, 6, 2, P.gray);
  // Arrow head
  c.fillRectC(10, 6, 1, 4, P.lightGray);
  c.fillRectC(11, 7, 1, 2, P.lightGray);
  c.setPixelC(12, 7, P.silver);
  c.setPixelC(12, 8, P.silver);
  c.save(path.join(OUT, 'marker_path_arrow.png'));
  console.log('  ✓ marker_path_arrow.png (16×16)');

  // Quest destination marker (16×16) — exclamation mark in gold circle
  c = createCanvas(16, 16);
  drawCircle(c, 8, 8, 5, P.darkGold, 180);
  drawCircle(c, 8, 8, 4, P.gold, 200);
  // Exclamation mark
  c.fillRectC(7, 4, 2, 5, P.white);
  c.fillRectC(7, 10, 2, 2, P.white);
  c.save(path.join(OUT, 'marker_quest.png'));
  console.log('  ✓ marker_quest.png (16×16)');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

console.log('Generating world map & waystone navigation assets…\n');

fs.mkdirSync(OUT, { recursive: true });

generateWorldMapBg();
generateWaystoneInactive();
generateWaystoneActive();
generateWaystoneTeleport();
generateZoneIcons();
generatePoiIcons();
generateFastTravelPanel();
generateFogTiles();
generateMarkers();

console.log(`\nDone — ${fs.readdirSync(OUT).length} files written to ${OUT}`);
