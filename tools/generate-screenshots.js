#!/usr/bin/env node
/**
 * Screenshot Generator for PixelRealm
 * Generates SVG walkthrough screenshots for all 19 zones and feature showcases.
 * Uses the game's actual zone color palettes from constants.ts.
 */

const fs = require('fs');
const path = require('path');

const W = 1200;
const H = 675;

// Zone data extracted from src/config/constants.ts
const ZONES = [
  { id: 'zone1',  name: 'Verdant Hollow',       biome: 'Forest',             bg: 0x0d1f0d, ground: 0x1e5a10, wall: 0x0a2408, accent: 0x44dd44, enemies: ['Slime', 'Mushroom'],            boss: 'Slime King',            level: 1,  diff: '1.0' },
  { id: 'zone2',  name: 'Dusty Trail',           biome: 'Plains / Desert',    bg: 0x2a1a08, ground: 0x5a3a10, wall: 0x3a2408, accent: 0xffaa44, enemies: ['Beetle', 'Bandit', 'Sentry'],   boss: 'Bandit Chief Korran',    level: 3,  diff: '1.5' },
  { id: 'zone3',  name: 'Ironveil Ruins',        biome: 'Dungeon',            bg: 0x0a0a1a, ground: 0x252540, wall: 0x080818, accent: 0xaa88ff, enemies: ['Wraith', 'Golem', 'Archer'],    boss: 'Archon Thessar',        level: 5,  diff: '2.0' },
  { id: 'zone4',  name: 'Saltmarsh Harbor',      biome: 'Ocean / Coastal',    bg: 0x061825, ground: 0x0d3050, wall: 0x041020, accent: 0x22aacc, enemies: ['Crab', 'Wisp', 'Raider'],       boss: 'Maw of the Deep',       level: 7,  diff: '2.5' },
  { id: 'zone5',  name: 'Ice Caverns',           biome: 'Ice / Cave',         bg: 0x040f1a, ground: 0x0d2a42, wall: 0x020a14, accent: 0x44aaff, enemies: ['Ice Elemental', 'Frost Wolf'],   boss: 'Glacial Wyrm Vorthex',  level: 9,  diff: '3.0' },
  { id: 'zone6',  name: 'Volcanic Highlands',    biome: 'Volcanic',           bg: 0x1a0800, ground: 0x4a1500, wall: 0x100500, accent: 0xff5500, enemies: ['Lava Slime', 'Fire Imp'],       boss: 'Infernal Warden',       level: 11, diff: '3.5' },
  { id: 'zone7',  name: 'Shadowmire Swamp',      biome: 'Swamp',              bg: 0x060e04, ground: 0x1a3a12, wall: 0x030802, accent: 0x44cc44, enemies: ['Bog Crawler', 'Toxic Toad'],     boss: 'Mire Queen',            level: 14, diff: '4.0' },
  { id: 'zone8',  name: 'Frostpeak Highlands',   biome: 'Ice / Mountain',     bg: 0x050d1a, ground: 0x0e2a4a, wall: 0x030a12, accent: 0x88ccff, enemies: ['Frost Elemental', 'Snow Wolf'],  boss: 'Frost Titan',           level: 17, diff: '4.5' },
  { id: 'zone9',  name: 'Celestial Spire',       biome: 'Sky / Celestial',    bg: 0x050a1a, ground: 0x0a1540, wall: 0x03071a, accent: 0xaaccff, enemies: ['Star Sentinel', 'Void Mage'],    boss: 'Celestial Arbiter',     level: 20, diff: '5.0' },
  { id: 'zone10', name: 'Abyssal Depths',        biome: 'Deep-Sea',           bg: 0x000a14, ground: 0x001a2e, wall: 0x00060e, accent: 0x0088cc, enemies: ['Deep Angler', 'Coral Golem'],    boss: 'Abyssal Kraken Lord',   level: 23, diff: '5.5' },
  { id: 'zone11', name: 'Dragonbone Wastes',     biome: 'Bone Wasteland',     bg: 0x1a0e05, ground: 0x3d2a1a, wall: 0x140a03, accent: 0xff8c00, enemies: ['Bone Revenant', 'Ashwyrm'],      boss: 'Ancient Dracolich',     level: 26, diff: '6.0' },
  { id: 'zone12', name: 'Void Sanctum',          biome: 'Void Dimension',     bg: 0x050008, ground: 0x0d001a, wall: 0x020005, accent: 0xcc33ff, enemies: ['Rift Walker', 'Void Sentinel'],   boss: 'Void Architect',        level: 29, diff: '6.5' },
  { id: 'zone13', name: 'Eclipsed Throne',       biome: 'Eclipsed Throne',    bg: 0x0d0800, ground: 0x2d1500, wall: 0x080400, accent: 0xffaa00, enemies: ['Eclipse Knight', 'Dusk Wraith'], boss: 'The Eclipsed King',     level: 32, diff: '7.0' },
  { id: 'zone14', name: 'Shattered Dominion',    biome: 'Shattered Realm',    bg: 0x0a0012, ground: 0x1a0030, wall: 0x050008, accent: 0xcc00ff, enemies: ['Shattered Golem', 'Dominion Shade'], boss: 'The Unmaker',       level: 35, diff: '7.5' },
  { id: 'zone15', name: 'Primordial Core',       biome: 'Primordial Core',    bg: 0x0d0600, ground: 0x1a0800, wall: 0x080300, accent: 0xff6600, enemies: ['Elemental Amalgam', 'Core Sentinel'], boss: 'The Genesis Flame', level: 38, diff: '8.0' },
  { id: 'zone16', name: 'Ethereal Nexus',        biome: 'Ethereal Nexus',     bg: 0x010510, ground: 0x061028, wall: 0x010208, accent: 0x00aaff, enemies: ['Nexus Guardian', 'Phase Strider'], boss: 'The Nexus Overseer', level: 41, diff: '8.5' },
  { id: 'zone17', name: 'Twilight Citadel',      biome: 'Twilight Citadel',   bg: 0x0c0410, ground: 0x1a0b28, wall: 0x080210, accent: 0xaa55ff, enemies: ['Twilight Sentinel', 'Rift Stalker'], boss: 'The Twilight Warden', level: 44, diff: '9.0' },
  { id: 'zone18', name: 'Oblivion Spire',        biome: 'Oblivion Spire',     bg: 0x030208, ground: 0x0a0820, wall: 0x020106, accent: 0xffd040, enemies: ['Spire Sentinel', 'Oblivion Wraith'], boss: 'The Spire Keeper', level: 47, diff: '9.5' },
  { id: 'zone19', name: 'Astral Pinnacle',       biome: 'Astral Pinnacle',    bg: 0x020212, ground: 0x0a0835, wall: 0x010108, accent: 0x88ccff, enemies: ['Astral Warden', 'Cosmic Devourer'], boss: 'The Astral Sovereign', level: 50, diff: '10.0' },
];

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function lighten(c, f) {
  const r = Math.min(255, ((c >> 16) & 0xff) + Math.round(f * 255));
  const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(f * 255));
  const b = Math.min(255, (c & 0xff) + Math.round(f * 255));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function darken(c, f) {
  const r = Math.max(0, Math.round(((c >> 16) & 0xff) * (1 - f)));
  const g = Math.max(0, Math.round(((c >> 8) & 0xff) * (1 - f)));
  const b = Math.max(0, Math.round((c & 0xff) * (1 - f)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Seeded pseudo-random for deterministic output
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateTerrainTiles(zone, rand) {
  let tiles = '';
  const tileSize = 24;
  const cols = Math.ceil(W / tileSize);
  const groundY = 420;  // ground starts here
  const rows = Math.ceil((H - groundY) / tileSize) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * tileSize;
      const y = groundY + row * tileSize;
      const variation = rand() > 0.6 ? darken(zone.ground, 0.15) : hex(zone.ground);
      tiles += `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${variation}"/>`;
      // Subtle texture dots
      if (rand() > 0.7) {
        const dx = x + Math.floor(rand() * (tileSize - 4));
        const dy = y + Math.floor(rand() * (tileSize - 4));
        tiles += `<rect x="${dx}" y="${dy}" width="4" height="4" fill="${darken(zone.ground, 0.3)}" opacity="0.5"/>`;
      }
    }
  }
  return tiles;
}

function generateWalls(zone, rand) {
  let walls = '';
  const wallH = 120;
  // Left wall cluster
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rand() * 120);
    const y = 300 + Math.floor(rand() * 120);
    const w = 48 + Math.floor(rand() * 48);
    const h = wallH + Math.floor(rand() * 60);
    walls += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${hex(zone.wall)}"/>`;
    walls += `<rect x="${x + 4}" y="${y - h + 4}" width="${w - 8}" height="8" fill="${lighten(zone.wall, 0.08)}"/>`;
  }
  // Right wall cluster
  for (let i = 0; i < 3; i++) {
    const x = W - 170 + Math.floor(rand() * 120);
    const y = 300 + Math.floor(rand() * 120);
    const w = 48 + Math.floor(rand() * 48);
    const h = wallH + Math.floor(rand() * 60);
    walls += `<rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="${hex(zone.wall)}"/>`;
    walls += `<rect x="${x + 4}" y="${y - h + 4}" width="${w - 8}" height="8" fill="${lighten(zone.wall, 0.08)}"/>`;
  }
  return walls;
}

function generateBiomeDecorations(zone, rand) {
  let deco = '';
  const ac = hex(zone.accent);
  const acDark = darken(zone.accent, 0.3);
  const zoneIdx = parseInt(zone.id.replace('zone', ''));

  // Biome-specific ambient decorations
  if (zoneIdx <= 1 || zoneIdx === 7) {
    // Forest / Swamp - trees
    for (let i = 0; i < 5; i++) {
      const x = 80 + Math.floor(rand() * (W - 200));
      const trunkH = 80 + Math.floor(rand() * 60);
      deco += `<rect x="${x}" y="${420 - trunkH}" width="12" height="${trunkH}" fill="${darken(zone.ground, 0.4)}"/>`;
      deco += `<rect x="${x - 20}" y="${420 - trunkH - 30}" width="52" height="36" fill="${acDark}"/>`;
      deco += `<rect x="${x - 12}" y="${420 - trunkH - 50}" width="36" height="24" fill="${ac}" opacity="0.8"/>`;
    }
  } else if (zoneIdx === 2) {
    // Desert - cacti and rocks
    for (let i = 0; i < 4; i++) {
      const x = 100 + Math.floor(rand() * (W - 300));
      deco += `<rect x="${x}" y="${370}" width="16" height="50" fill="${ac}" opacity="0.7"/>`;
      deco += `<rect x="${x - 12}" y="${385}" width="12" height="8" fill="${ac}" opacity="0.7"/>`;
      deco += `<rect x="${x + 16}" y="${378}" width="12" height="8" fill="${ac}" opacity="0.7"/>`;
    }
  } else if (zoneIdx === 3) {
    // Dungeon - pillars and runes
    for (let i = 0; i < 4; i++) {
      const x = 150 + i * 250;
      deco += `<rect x="${x}" y="${300}" width="24" height="120" fill="${darken(zone.wall, 0.2)}"/>`;
      deco += `<rect x="${x - 4}" y="${296}" width="32" height="12" fill="${hex(zone.wall)}"/>`;
      deco += `<rect x="${x - 4}" y="${416}" width="32" height="12" fill="${hex(zone.wall)}"/>`;
      deco += `<rect x="${x + 8}" y="${340}" width="8" height="8" fill="${ac}" opacity="0.6"/>`;
      deco += `<rect x="${x + 8}" y="${380}" width="8" height="8" fill="${ac}" opacity="0.4"/>`;
    }
  } else if (zoneIdx === 4) {
    // Coastal - waves and docks
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rand() * W);
      const y = 425 + Math.floor(rand() * 30);
      deco += `<rect x="${x}" y="${y}" width="${20 + Math.floor(rand() * 30)}" height="4" fill="${ac}" opacity="0.3"/>`;
    }
    deco += `<rect x="200" y="${380}" width="120" height="8" fill="${darken(zone.ground, 0.3)}"/>`;
    deco += `<rect x="220" y="${380}" width="8" height="40" fill="${darken(zone.ground, 0.4)}"/>`;
    deco += `<rect x="300" y="${380}" width="8" height="40" fill="${darken(zone.ground, 0.4)}"/>`;
  } else if (zoneIdx === 5 || zoneIdx === 8) {
    // Ice - crystals and snow
    for (let i = 0; i < 6; i++) {
      const x = 80 + Math.floor(rand() * (W - 200));
      const h = 30 + Math.floor(rand() * 40);
      deco += `<polygon points="${x},${420} ${x + 10},${420 - h} ${x + 20},${420}" fill="${ac}" opacity="0.5"/>`;
      deco += `<polygon points="${x + 3},${420} ${x + 10},${420 - h + 8} ${x + 17},${420}" fill="${lighten(zone.accent, 0.2)}" opacity="0.3"/>`;
    }
  } else if (zoneIdx === 6 || zoneIdx === 15) {
    // Volcanic / Primordial - lava pools and embers
    for (let i = 0; i < 4; i++) {
      const x = 100 + Math.floor(rand() * (W - 300));
      deco += `<ellipse cx="${x}" cy="${430}" rx="${30 + Math.floor(rand() * 20)}" ry="8" fill="${ac}" opacity="0.6"/>`;
      deco += `<ellipse cx="${x}" cy="${428}" rx="${20 + Math.floor(rand() * 10)}" ry="4" fill="${lighten(zone.accent, 0.3)}" opacity="0.4"/>`;
    }
    // Floating embers
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(rand() * W);
      const y = 200 + Math.floor(rand() * 200);
      deco += `<rect x="${x}" y="${y}" width="3" height="3" fill="${ac}" opacity="${0.3 + rand() * 0.5}"/>`;
    }
  } else if (zoneIdx === 9) {
    // Celestial - stars and platforms
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * 350);
      const s = 2 + Math.floor(rand() * 4);
      deco += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${ac}" opacity="${0.2 + rand() * 0.6}"/>`;
    }
  } else if (zoneIdx === 10) {
    // Abyssal - bubbles and bioluminescence
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * 400);
      const r = 3 + Math.floor(rand() * 6);
      deco += `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${ac}" stroke-width="1" opacity="${0.15 + rand() * 0.3}"/>`;
    }
    for (let i = 0; i < 8; i++) {
      const x = Math.floor(rand() * W);
      const y = 350 + Math.floor(rand() * 70);
      deco += `<rect x="${x}" y="${y}" width="4" height="${12 + Math.floor(rand() * 20)}" fill="${ac}" opacity="0.2"/>`;
      deco += `<circle cx="${x + 2}" cy="${y}" r="4" fill="${ac}" opacity="0.3"/>`;
    }
  } else if (zoneIdx === 11) {
    // Dragonbone - bones and ash
    for (let i = 0; i < 4; i++) {
      const x = 80 + Math.floor(rand() * (W - 200));
      // Rib bone
      deco += `<rect x="${x}" y="${380}" width="8" height="40" fill="#d4c4a0" opacity="0.4" transform="rotate(${-15 + Math.floor(rand() * 30)}, ${x + 4}, ${400})"/>`;
      deco += `<rect x="${x + 30}" y="${385}" width="6" height="35" fill="#c8b890" opacity="0.35" transform="rotate(${-10 + Math.floor(rand() * 20)}, ${x + 33}, ${402})"/>`;
    }
    // Skull
    deco += `<rect x="700" y="${380}" width="40" height="30" fill="#d4c4a0" opacity="0.5"/>`;
    deco += `<rect x="705" y="${388}" width="10" height="8" fill="${hex(zone.bg)}"/>`;
    deco += `<rect x="725" y="${388}" width="10" height="8" fill="${hex(zone.bg)}"/>`;
  } else if (zoneIdx === 12 || zoneIdx === 14 || zoneIdx === 16) {
    // Void/Shattered/Ethereal - rifts and particles
    for (let i = 0; i < 3; i++) {
      const x = 200 + Math.floor(rand() * (W - 400));
      const y = 200 + Math.floor(rand() * 150);
      deco += `<ellipse cx="${x}" cy="${y}" rx="3" ry="${20 + Math.floor(rand() * 40)}" fill="${ac}" opacity="0.3" transform="rotate(${Math.floor(rand() * 30) - 15}, ${x}, ${y})"/>`;
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * 400);
      deco += `<rect x="${x}" y="${y}" width="2" height="2" fill="${ac}" opacity="${0.2 + rand() * 0.5}"/>`;
    }
  } else if (zoneIdx === 13 || zoneIdx === 18) {
    // Eclipsed/Oblivion - eclipse/void glow
    deco += `<circle cx="${W / 2}" cy="120" r="60" fill="${darken(zone.accent, 0.5)}"/>`;
    deco += `<circle cx="${W / 2}" cy="120" r="55" fill="${hex(zone.bg)}"/>`;
    deco += `<circle cx="${W / 2 + 8}" cy="118" r="48" fill="${ac}" opacity="0.1"/>`;
    // Rays
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = W / 2 + Math.cos(angle) * 65;
      const y1 = 120 + Math.sin(angle) * 65;
      const x2 = W / 2 + Math.cos(angle) * 140;
      const y2 = 120 + Math.sin(angle) * 140;
      deco += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ac}" stroke-width="2" opacity="0.15"/>`;
    }
  } else if (zoneIdx === 17) {
    // Twilight - citadel towers
    deco += `<rect x="100" y="200" width="60" height="220" fill="${hex(zone.wall)}"/>`;
    deco += `<polygon points="100,200 130,140 160,200" fill="${darken(zone.wall, 0.1)}"/>`;
    deco += `<rect x="110" y="280" width="12" height="16" fill="${ac}" opacity="0.4"/>`;
    deco += `<rect x="138" y="260" width="12" height="16" fill="${ac}" opacity="0.3"/>`;

    deco += `<rect x="${W - 180}" y="240" width="50" height="180" fill="${hex(zone.wall)}"/>`;
    deco += `<polygon points="${W - 180},240 ${W - 155},180 ${W - 130},240" fill="${darken(zone.wall, 0.1)}"/>`;
    deco += `<rect x="${W - 170}" y="300" width="10" height="14" fill="${ac}" opacity="0.3"/>`;
  } else if (zoneIdx === 19) {
    // Astral - nebulae and star fields
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(rand() * W);
      const y = Math.floor(rand() * 400);
      const s = 1 + Math.floor(rand() * 3);
      deco += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${ac}" opacity="${0.2 + rand() * 0.6}"/>`;
    }
    // Nebula clouds
    deco += `<ellipse cx="300" cy="150" rx="120" ry="60" fill="${ac}" opacity="0.06"/>`;
    deco += `<ellipse cx="800" cy="200" rx="100" ry="50" fill="${darken(zone.accent, 0.3)}" opacity="0.08"/>`;
    deco += `<ellipse cx="550" cy="100" rx="80" ry="40" fill="${lighten(zone.accent, 0.1)}" opacity="0.05"/>`;
  }

  return deco;
}

function generatePlayerSprite(x, y, accentColor) {
  const ac = hex(accentColor);
  // 32x32-style pixel character at 3x scale
  return `
  <g transform="translate(${x}, ${y})">
    <!-- Shadow -->
    <ellipse cx="16" cy="48" rx="14" ry="4" fill="#000" opacity="0.3"/>
    <!-- Boots -->
    <rect x="4" y="40" width="10" height="8" fill="#5a3a1a"/>
    <rect x="18" y="40" width="10" height="8" fill="#5a3a1a"/>
    <!-- Legs -->
    <rect x="6" y="32" width="8" height="10" fill="#334488"/>
    <rect x="18" y="32" width="8" height="10" fill="#334488"/>
    <!-- Body armor -->
    <rect x="4" y="16" width="24" height="18" fill="#668844"/>
    <rect x="8" y="18" width="16" height="14" fill="#88aa55"/>
    <!-- Belt -->
    <rect x="4" y="30" width="24" height="4" fill="#6a4422"/>
    <rect x="14" y="29" width="4" height="6" fill="${ac}"/>
    <!-- Head -->
    <rect x="6" y="2" width="20" height="16" fill="#e8c090"/>
    <!-- Hair -->
    <rect x="4" y="0" width="24" height="8" fill="#5a3020"/>
    <rect x="4" y="6" width="4" height="6" fill="#5a3020"/>
    <!-- Eyes -->
    <rect x="10" y="8" width="4" height="4" fill="#222"/>
    <rect x="18" y="8" width="4" height="4" fill="#222"/>
    <!-- Weapon (sword) -->
    <rect x="30" y="8" width="4" height="28" fill="#aabbcc"/>
    <rect x="28" y="22" width="8" height="4" fill="#886644"/>
    <rect x="30" y="4" width="4" height="6" fill="#ddeeff"/>
  </g>`;
}

function generateEnemySprite(x, y, zone, index, rand) {
  const ac = hex(zone.accent);
  const acDark = darken(zone.accent, 0.3);
  const type = index % 3; // vary shapes

  if (type === 0) {
    // Blob/slime type
    return `
    <g transform="translate(${x}, ${y})">
      <ellipse cx="14" cy="22" rx="14" ry="4" fill="#000" opacity="0.2"/>
      <rect x="2" y="8" width="24" height="16" rx="4" fill="${acDark}"/>
      <rect x="4" y="6" width="20" height="14" rx="3" fill="${ac}" opacity="0.8"/>
      <rect x="8" y="10" width="4" height="4" fill="#fff"/>
      <rect x="16" y="10" width="4" height="4" fill="#fff"/>
      <rect x="9" y="11" width="2" height="2" fill="#111"/>
      <rect x="17" y="11" width="2" height="2" fill="#111"/>
    </g>`;
  } else if (type === 1) {
    // Humanoid type
    return `
    <g transform="translate(${x}, ${y})">
      <ellipse cx="12" cy="36" rx="10" ry="3" fill="#000" opacity="0.2"/>
      <rect x="4" y="28" width="6" height="8" fill="${acDark}"/>
      <rect x="14" y="28" width="6" height="8" fill="${acDark}"/>
      <rect x="2" y="14" width="20" height="16" fill="${acDark}"/>
      <rect x="4" y="16" width="16" height="12" fill="${ac}" opacity="0.7"/>
      <rect x="4" y="2" width="16" height="14" fill="${ac}"/>
      <rect x="8" y="6" width="3" height="3" fill="#ff2222"/>
      <rect x="14" y="6" width="3" height="3" fill="#ff2222"/>
      <rect x="-4" y="18" width="8" height="4" fill="${acDark}"/>
      <rect x="20" y="18" width="8" height="4" fill="${acDark}"/>
    </g>`;
  } else {
    // Beast type
    return `
    <g transform="translate(${x}, ${y})">
      <ellipse cx="18" cy="30" rx="16" ry="4" fill="#000" opacity="0.2"/>
      <rect x="0" y="12" width="36" height="18" rx="3" fill="${acDark}"/>
      <rect x="4" y="14" width="28" height="14" fill="${ac}" opacity="0.6"/>
      <rect x="28" y="8" width="12" height="8" fill="${acDark}"/>
      <rect x="32" y="10" width="4" height="3" fill="#ff4444"/>
      <rect x="0" y="26" width="6" height="8" fill="${acDark}"/>
      <rect x="12" y="26" width="6" height="8" fill="${acDark}"/>
      <rect x="24" y="26" width="6" height="8" fill="${acDark}"/>
      <rect x="4" y="4" width="8" height="10" fill="${ac}" opacity="0.5"/>
      <rect x="22" y="4" width="8" height="10" fill="${ac}" opacity="0.5"/>
    </g>`;
  }
}

function generateDamageNumbers(rand) {
  let dmg = '';
  const nums = ['-24', '-18', '-31', 'MISS', '-42'];
  for (let i = 0; i < 3; i++) {
    const x = 350 + Math.floor(rand() * 400);
    const y = 300 + Math.floor(rand() * 80);
    const n = nums[Math.floor(rand() * nums.length)];
    const color = n === 'MISS' ? '#aaaaaa' : '#ff4444';
    dmg += `<text x="${x}" y="${y}" font-family="monospace" font-size="16" fill="${color}" font-weight="bold" opacity="${0.6 + rand() * 0.4}">${n}</text>`;
  }
  return dmg;
}

function generateHUD(zone) {
  const ac = hex(zone.accent);
  const zoneIdx = parseInt(zone.id.replace('zone', ''));

  return `
  <!-- HUD Background strips -->
  <rect x="0" y="0" width="${W}" height="56" fill="#000" opacity="0.6"/>
  <rect x="0" y="${H - 52}" width="${W}" height="52" fill="#000" opacity="0.6"/>

  <!-- Zone title -->
  <text x="24" y="22" font-family="monospace" font-size="11" fill="#888">ZONE ${zoneIdx}</text>
  <text x="24" y="42" font-family="monospace" font-size="18" fill="${ac}" font-weight="bold">${zone.name}</text>

  <!-- HP bar -->
  <text x="${W - 380}" y="18" font-family="monospace" font-size="11" fill="#cc4444">HP</text>
  <rect x="${W - 350}" y="8" width="160" height="14" fill="#1a0000" stroke="#442222" stroke-width="1"/>
  <rect x="${W - 349}" y="9" width="120" height="12" fill="#cc2222"/>
  <rect x="${W - 349}" y="9" width="120" height="6" fill="#ee4444" opacity="0.5"/>
  <text x="${W - 340}" y="19" font-family="monospace" font-size="10" fill="#fff" font-weight="bold">246 / 320</text>

  <!-- MP bar -->
  <text x="${W - 380}" y="38" font-family="monospace" font-size="11" fill="#4488cc">MP</text>
  <rect x="${W - 350}" y="28" width="160" height="14" fill="#000a14" stroke="#224488" stroke-width="1"/>
  <rect x="${W - 349}" y="29" width="100" height="12" fill="#2266cc"/>
  <rect x="${W - 349}" y="29" width="100" height="6" fill="#4488ee" opacity="0.5"/>
  <text x="${W - 340}" y="39" font-family="monospace" font-size="10" fill="#fff" font-weight="bold">85 / 120</text>

  <!-- Level -->
  <rect x="${W - 170}" y="8" width="36" height="36" fill="#222" stroke="#555" stroke-width="1"/>
  <text x="${W - 160}" y="18" font-family="monospace" font-size="8" fill="#888">LVL</text>
  <text x="${W - 158}" y="38" font-family="monospace" font-size="18" fill="#fff" font-weight="bold">${zone.level}</text>

  <!-- XP bar -->
  <rect x="${W - 126}" y="8" width="100" height="8" fill="#111" stroke="#333" stroke-width="1"/>
  <rect x="${W - 125}" y="9" width="${30 + (zoneIdx * 3)}" height="6" fill="#ccaa22"/>
  <text x="${W - 120}" y="35" font-family="monospace" font-size="9" fill="#888">Difficulty: ${zone.diff}</text>

  <!-- Bottom bar - hotkeys -->
  <g transform="translate(${W / 2 - 200}, ${H - 46})">
    ${[1,2,3,4,5,6].map((n, i) => `
      <rect x="${i * 68}" y="0" width="60" height="40" rx="3" fill="#1a1a2a" stroke="#444" stroke-width="1"/>
      <text x="${i * 68 + 6}" y="14" font-family="monospace" font-size="10" fill="#666">${n}</text>
      <rect x="${i * 68 + 14}" y="8" width="32" height="24" rx="2" fill="${i === 0 ? ac : '#333'}" opacity="${i === 0 ? 0.6 : 0.3}"/>
    `).join('')}
  </g>

  <!-- Minimap -->
  <rect x="${W - 130}" y="${H - 48}" width="108" height="40" fill="#0a0a14" stroke="#444" stroke-width="1"/>
  <rect x="${W - 126}" y="${H - 44}" width="100" height="32" fill="${darken(zone.bg, 0.3)}"/>
  <rect x="${W - 80}" y="${H - 30}" width="4" height="4" fill="#44ff44"/>
  <rect x="${W - 100}" y="${H - 36}" width="3" height="3" fill="#ff4444"/>
  <rect x="${W - 90}" y="${H - 26}" width="3" height="3" fill="#ff4444"/>

  <!-- Biome label -->
  <text x="24" y="${H - 18}" font-family="monospace" font-size="12" fill="#666">${zone.biome}</text>
  `;
}

function generateZoneScreenshot(zone) {
  const rand = mulberry32(parseInt(zone.id.replace('zone', '')) * 1337);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="image-rendering: pixelated;">
  <defs>
    <style>text { font-family: monospace; }</style>
  </defs>

  <!-- Background sky -->
  <rect width="${W}" height="${H}" fill="${hex(zone.bg)}"/>
  <!-- Sky gradient layers -->
  <rect width="${W}" height="350" fill="${lighten(zone.bg, 0.03)}" opacity="0.5"/>
  <rect width="${W}" height="200" fill="${lighten(zone.bg, 0.05)}" opacity="0.3"/>

  <!-- Atmospheric particles -->
  ${Array.from({length: 15}, () => {
    const x = Math.floor(rand() * W);
    const y = Math.floor(rand() * 380);
    return `<rect x="${x}" y="${y}" width="2" height="2" fill="${hex(zone.accent)}" opacity="${0.05 + rand() * 0.15}"/>`;
  }).join('\n  ')}

  <!-- Background wall structures -->
  ${generateWalls(zone, rand)}

  <!-- Biome decorations -->
  ${generateBiomeDecorations(zone, rand)}

  <!-- Ground terrain tiles -->
  ${generateTerrainTiles(zone, rand)}

  <!-- Ground line accent -->
  <rect x="0" y="418" width="${W}" height="4" fill="${hex(zone.accent)}" opacity="0.15"/>

  <!-- Enemies -->
  ${generateEnemySprite(680, 374, zone, 0, rand)}
  ${generateEnemySprite(800, 380, zone, 1, rand)}
  ${generateEnemySprite(920, 370, zone, 2, rand)}

  <!-- Player character -->
  ${generatePlayerSprite(500, 372, zone.accent)}

  <!-- Combat damage numbers -->
  ${generateDamageNumbers(rand)}

  <!-- HUD overlay -->
  ${generateHUD(zone)}

</svg>`;

  return svg;
}

// Feature showcase generators
function generateFeatureScreenshot(feature) {
  const configs = {
    'class-selection': {
      title: 'Choose Your Class',
      subtitle: '4 Classes - 12 Archetypes',
      bg: 0x0a0a1a,
      accent: 0xaaccff,
    },
    'combat-system': {
      title: 'Real-Time Combat',
      subtitle: 'Action-packed battles across 19 zones',
      bg: 0x1a0800,
      accent: 0xff5500,
    },
    'crafting-station': {
      title: 'Crafting & Economy',
      subtitle: 'Forge weapons, brew potions, enchant gear',
      bg: 0x0e1408,
      accent: 0xaaddaa,
    },
    'guild-territory': {
      title: 'Guild Wars & Territory',
      subtitle: 'Claim territory, wage war, build your guild',
      bg: 0x0d0800,
      accent: 0xffaa00,
    },
    'pvp-arena': {
      title: 'PvP Arena',
      subtitle: '1v1 and 2v2 ranked matches with ELO rating',
      bg: 0x1a0008,
      accent: 0xff4444,
    },
    'player-housing': {
      title: 'Player Housing',
      subtitle: '20 plots - Cottages, Manors, Estates',
      bg: 0x0e1408,
      accent: 0xccaa44,
    },
    'fishing-system': {
      title: 'Fishing & Exploration',
      subtitle: 'Zone-specific catches with fish journal',
      bg: 0x061825,
      accent: 0x22aacc,
    },
  };

  const cfg = configs[feature];
  const ac = hex(cfg.accent);
  const bg = hex(cfg.bg);
  const bgL = lighten(cfg.bg, 0.05);
  const acD = darken(cfg.accent, 0.3);
  const rand = mulberry32(feature.length * 7919);

  let content = '';

  if (feature === 'class-selection') {
    const classes = [
      { name: 'Warrior', color: '#cc4444', archetypes: ['Berserker', 'Guardian', 'Paladin'] },
      { name: 'Mage', color: '#4488dd', archetypes: ['Pyromancer', 'Frostbinder', 'Arcanist'] },
      { name: 'Ranger', color: '#44aa44', archetypes: ['Sharpshooter', 'Shadowstalker', 'Beastmaster'] },
      { name: 'Artisan', color: '#ccaa44', archetypes: ['Blacksmith', 'Alchemist', 'Enchanter'] },
    ];
    classes.forEach((cls, i) => {
      const x = 80 + i * 280;
      content += `
        <rect x="${x}" y="150" width="220" height="380" rx="6" fill="#0a0a1a" stroke="${cls.color}" stroke-width="2" opacity="0.9"/>
        <rect x="${x}" y="150" width="220" height="50" rx="6" fill="${cls.color}" opacity="0.2"/>
        <text x="${x + 110}" y="182" font-family="monospace" font-size="20" fill="${cls.color}" text-anchor="middle" font-weight="bold">${cls.name}</text>
        <!-- Character silhouette -->
        <rect x="${x + 70}" y="220" width="80" height="100" rx="4" fill="${cls.color}" opacity="0.15"/>
        <rect x="${x + 86}" y="230" width="48" height="48" fill="${cls.color}" opacity="0.25"/>
        <rect x="${x + 94}" y="216" width="32" height="32" fill="${cls.color}" opacity="0.3"/>
        <rect x="${x + 82}" y="280" width="20" height="30" fill="${cls.color}" opacity="0.2"/>
        <rect x="${x + 118}" y="280" width="20" height="30" fill="${cls.color}" opacity="0.2"/>
        ${cls.archetypes.map((arc, j) => `
          <rect x="${x + 20}" y="${345 + j * 50}" width="180" height="38" rx="3" fill="#111122" stroke="#333" stroke-width="1"/>
          <text x="${x + 110}" y="${369 + j * 50}" font-family="monospace" font-size="14" fill="${cls.color}" text-anchor="middle">${arc}</text>
        `).join('')}
      `;
    });
    // Selection highlight on Warrior
    content += `<rect x="80" y="150" width="220" height="380" rx="6" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>`;
  }

  if (feature === 'combat-system') {
    // Combat scene with multiple enemies and effects
    const ground = darken(cfg.accent, 0.6);
    // Ground
    for (let col = 0; col < 50; col++) {
      const x = col * 24;
      const v = rand() > 0.5 ? ground : darken(cfg.accent, 0.7);
      content += `<rect x="${x}" y="420" width="24" height="255" fill="${v}"/>`;
    }
    content += `<rect x="0" y="418" width="${W}" height="4" fill="${ac}" opacity="0.2"/>`;

    // Player with attack animation
    content += generatePlayerSprite(400, 370, cfg.accent);
    // Sword slash effect
    content += `<rect x="436" y="360" width="60" height="4" fill="#fff" opacity="0.8" transform="rotate(-30, 436, 362)"/>`;
    content += `<rect x="440" y="355" width="50" height="3" fill="${ac}" opacity="0.6" transform="rotate(-20, 440, 356)"/>`;

    // Multiple enemies
    for (let i = 0; i < 5; i++) {
      const ex = 550 + i * 100;
      const ey = 375 + Math.floor(rand() * 20);
      content += `
        <g transform="translate(${ex}, ${ey})">
          <ellipse cx="14" cy="24" rx="12" ry="3" fill="#000" opacity="0.2"/>
          <rect x="2" y="4" width="24" height="20" rx="3" fill="${acD}"/>
          <rect x="4" y="6" width="20" height="16" rx="2" fill="${ac}" opacity="0.6"/>
          <rect x="8" y="10" width="3" height="3" fill="#ff2222"/>
          <rect x="16" y="10" width="3" height="3" fill="#ff2222"/>
          <!-- HP bar above enemy -->
          <rect x="0" y="-6" width="28" height="4" fill="#1a0000"/>
          <rect x="0" y="-6" width="${14 + Math.floor(rand() * 14)}" height="4" fill="#cc2222"/>
        </g>
      `;
    }
    // Damage numbers
    content += `<text x="570" y="350" font-family="monospace" font-size="18" fill="#ff4444" font-weight="bold">-42</text>`;
    content += `<text x="690" y="340" font-family="monospace" font-size="16" fill="#ff6644" font-weight="bold">-31</text>`;
    content += `<text x="820" y="355" font-family="monospace" font-size="14" fill="#ffaa44" font-weight="bold">CRIT -68</text>`;

    // Combat HUD
    content += `
      <rect x="0" y="0" width="${W}" height="50" fill="#000" opacity="0.6"/>
      <text x="24" y="34" font-family="monospace" font-size="20" fill="${ac}" font-weight="bold">Wave 2 / 3</text>
      <text x="${W - 300}" y="22" font-family="monospace" font-size="12" fill="#888">Enemies remaining: 5</text>
      <rect x="${W - 300}" y="28" width="200" height="10" fill="#111" stroke="#333"/>
      <rect x="${W - 299}" y="29" width="120" height="8" fill="#cc2222"/>
    `;
  }

  if (feature === 'crafting-station') {
    // Crafting UI overlay
    content += `
      <!-- Crafting panel background -->
      <rect x="200" y="80" width="800" height="500" rx="8" fill="#0c1408" stroke="#446633" stroke-width="2"/>
      <rect x="200" y="80" width="800" height="50" fill="#1a2a14" rx="8"/>
      <text x="600" y="112" font-family="monospace" font-size="22" fill="${ac}" text-anchor="middle" font-weight="bold">Crafting Station</text>

      <!-- Recipe list -->
      <rect x="220" y="150" width="280" height="400" rx="4" fill="#0a1008" stroke="#334422" stroke-width="1"/>
      <text x="360" y="175" font-family="monospace" font-size="14" fill="#888" text-anchor="middle">Recipes</text>
      ${['Iron Sword', 'Steel Helmet', 'Health Potion', 'Mana Elixir', 'Fire Enchant', 'Frost Shield', 'Dragon Blade', 'Healing Staff'].map((item, i) => `
        <rect x="230" y="${190 + i * 44}" width="260" height="36" rx="3" fill="${i === 2 ? '#1a2a14' : '#0e1408'}" stroke="${i === 2 ? ac : '#222'}" stroke-width="1"/>
        <rect x="238" y="${194 + i * 44}" width="28" height="28" rx="2" fill="#1a2a14"/>
        <text x="278" y="${213 + i * 44}" font-family="monospace" font-size="12" fill="${i === 2 ? '#fff' : '#888'}">${item}</text>
      `).join('')}

      <!-- Crafting detail -->
      <rect x="520" y="150" width="460" height="250" rx="4" fill="#0a1008" stroke="#334422" stroke-width="1"/>
      <text x="750" y="180" font-family="monospace" font-size="18" fill="#fff" text-anchor="middle">Health Potion</text>
      <text x="750" y="200" font-family="monospace" font-size="11" fill="#888" text-anchor="middle">Restores 120 HP over 5 seconds</text>
      <!-- Ingredients -->
      <text x="540" y="235" font-family="monospace" font-size="12" fill="#888">Materials:</text>
      ${['Forest Spore x3', 'Ancient Bark x1', 'Water Essence x2'].map((mat, i) => `
        <rect x="540" y="${245 + i * 35}" width="200" height="28" rx="2" fill="#0e1408" stroke="#333" stroke-width="1"/>
        <rect x="548" y="${249 + i * 35}" width="20" height="20" rx="2" fill="#2a3e18"/>
        <text x="576" y="${264 + i * 35}" font-family="monospace" font-size="11" fill="#aaddaa">${mat}</text>
      `).join('')}
      <!-- Craft button -->
      <rect x="760" y="${340}" width="200" height="40" rx="4" fill="#2a5a18" stroke="${ac}" stroke-width="1"/>
      <text x="860" y="366" font-family="monospace" font-size="16" fill="#fff" text-anchor="middle" font-weight="bold">CRAFT</text>

      <!-- Result slot -->
      <rect x="520" y="420" width="460" height="110" rx="4" fill="#0a1008" stroke="#334422" stroke-width="1"/>
      <text x="540" y="448" font-family="monospace" font-size="12" fill="#888">Output:</text>
      <rect x="540" y="458" width="48" height="48" rx="4" fill="#1a2a14" stroke="${ac}" stroke-width="2"/>
      <text x="600" y="482" font-family="monospace" font-size="14" fill="${ac}">Health Potion x1</text>
      <text x="600" y="500" font-family="monospace" font-size="10" fill="#666">Cost: 5 Gold</text>
    `;
  }

  if (feature === 'guild-territory') {
    // Territory map view
    content += `
      <rect x="100" y="60" width="1000" height="540" rx="8" fill="#0d0a04" stroke="#554422" stroke-width="2"/>
      <text x="600" y="96" font-family="monospace" font-size="22" fill="${ac}" text-anchor="middle" font-weight="bold">Guild Territory Map</text>

      <!-- Grid territories -->
      ${Array.from({length: 16}, (_, i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 140 + col * 230;
        const y = 120 + row * 115;
        const colors = ['#443322', '#224433', '#332244', '#442233', '#333322', '#223344'];
        const guilds = ['Dragon Slayers', 'Shadow Guild', 'Iron Forge', 'Free', 'Astral Order', 'Night Watch'];
        const gIdx = i % guilds.length;
        const claimed = gIdx !== 3;
        return `
          <rect x="${x}" y="${y}" width="210" height="95" rx="4" fill="${claimed ? colors[gIdx] : '#1a1a1a'}" stroke="${claimed ? ac : '#333'}" stroke-width="${claimed ? 2 : 1}" opacity="0.8"/>
          <text x="${x + 105}" y="${y + 35}" font-family="monospace" font-size="11" fill="${claimed ? '#fff' : '#555'}" text-anchor="middle">${claimed ? guilds[gIdx] : 'Unclaimed'}</text>
          <text x="${x + 105}" y="${y + 55}" font-family="monospace" font-size="9" fill="${claimed ? '#aaa' : '#444'}" text-anchor="middle">${claimed ? `Power: ${500 + i * 120}` : 'Available'}</text>
          ${claimed ? `<rect x="${x + 80}" y="${y + 65}" width="50" height="18" rx="2" fill="#442200" stroke="#664400" stroke-width="1"/>
          <text x="${x + 105}" y="${y + 78}" font-family="monospace" font-size="9" fill="#ffaa44" text-anchor="middle">WAR</text>` : ''}
        `;
      }).join('')}
    `;
  }

  if (feature === 'pvp-arena') {
    const ground = darken(cfg.accent, 0.7);
    // Arena floor
    for (let col = 0; col < 50; col++) {
      const x = col * 24;
      const v = rand() > 0.5 ? '#2a1a1a' : '#1a0a0a';
      content += `<rect x="${x}" y="400" width="24" height="275" fill="${v}"/>`;
    }
    // Arena walls
    content += `<rect x="0" y="380" width="100" height="120" fill="#331111"/>`;
    content += `<rect x="${W - 100}" y="380" width="100" height="120" fill="#331111"/>`;
    content += `<rect x="0" y="396" width="${W}" height="6" fill="${ac}" opacity="0.2"/>`;

    // Player 1
    content += generatePlayerSprite(350, 356, 0x4488ff);
    content += `<text x="370" y="346" font-family="monospace" font-size="12" fill="#4488ff" text-anchor="middle">xDragonSlayer</text>`;

    // Player 2 (mirrored)
    content += `
    <g transform="translate(750, 360)">
      <ellipse cx="16" cy="48" rx="14" ry="4" fill="#000" opacity="0.3"/>
      <rect x="4" y="40" width="10" height="8" fill="#5a3a1a"/>
      <rect x="18" y="40" width="10" height="8" fill="#5a3a1a"/>
      <rect x="6" y="32" width="8" height="10" fill="#882222"/>
      <rect x="18" y="32" width="8" height="10" fill="#882222"/>
      <rect x="4" y="16" width="24" height="18" fill="#aa3333"/>
      <rect x="8" y="18" width="16" height="14" fill="#cc4444" opacity="0.7"/>
      <rect x="4" y="30" width="24" height="4" fill="#6a4422"/>
      <rect x="6" y="2" width="20" height="16" fill="#e8c090"/>
      <rect x="4" y="0" width="24" height="8" fill="#333"/>
      <rect x="10" y="8" width="4" height="4" fill="#222"/>
      <rect x="18" y="8" width="4" height="4" fill="#222"/>
      <rect x="-6" y="10" width="4" height="24" fill="#aa6633"/>
      <rect x="-8" y="6" width="8" height="6" fill="#cc8844"/>
    </g>`;
    content += `<text x="770" y="346" font-family="monospace" font-size="12" fill="#ff4444" text-anchor="middle">NightBlade99</text>`;

    // Arena HUD
    content += `
      <rect x="0" y="0" width="${W}" height="80" fill="#000" opacity="0.7"/>
      <text x="${W / 2}" y="30" font-family="monospace" font-size="24" fill="#ff4444" text-anchor="middle" font-weight="bold">PVP ARENA - 1v1 RANKED</text>
      <text x="${W / 2}" y="55" font-family="monospace" font-size="14" fill="#888" text-anchor="middle">Round 2 of 3 | Time: 1:42</text>

      <!-- P1 info -->
      <rect x="80" y="90" width="300" height="40" rx="4" fill="#000" opacity="0.5"/>
      <text x="90" y="116" font-family="monospace" font-size="14" fill="#4488ff">xDragonSlayer</text>
      <rect x="240" y="100" width="130" height="12" fill="#111"/>
      <rect x="241" y="101" width="90" height="10" fill="#4488ff"/>
      <text x="250" y="115" font-family="monospace" font-size="8" fill="#fff">Gold (1542 ELO)</text>

      <!-- P2 info -->
      <rect x="${W - 380}" y="90" width="300" height="40" rx="4" fill="#000" opacity="0.5"/>
      <text x="${W - 370}" y="116" font-family="monospace" font-size="14" fill="#ff4444">NightBlade99</text>
      <rect x="${W - 230}" y="100" width="130" height="12" fill="#111"/>
      <rect x="${W - 229}" y="101" width="70" height="10" fill="#ff4444"/>
      <text x="${W - 222}" y="115" font-family="monospace" font-size="8" fill="#fff">Silver (1380 ELO)</text>

      <!-- Score -->
      <text x="${W / 2 - 40}" y="110" font-family="monospace" font-size="28" fill="#4488ff" font-weight="bold">1</text>
      <text x="${W / 2}" y="110" font-family="monospace" font-size="28" fill="#666" text-anchor="middle">-</text>
      <text x="${W / 2 + 30}" y="110" font-family="monospace" font-size="28" fill="#ff4444" font-weight="bold">0</text>
    `;
  }

  if (feature === 'player-housing') {
    // Interior view
    content += `
      <!-- Room background -->
      <rect x="150" y="100" width="900" height="475" fill="#1a1408"/>
      <!-- Floor -->
      ${Array.from({length: 38}, (_, i) => `<rect x="${150 + i * 24}" y="420" width="24" height="155" fill="${i % 2 === 0 ? '#2a1e14' : '#241a10'}"/>`).join('')}
      <!-- Back wall -->
      <rect x="150" y="100" width="900" height="320" fill="#1a1610"/>
      <!-- Wall trim -->
      <rect x="150" y="300" width="900" height="8" fill="#2a2218"/>
      <rect x="150" y="100" width="900" height="6" fill="#2a2218"/>

      <!-- Window -->
      <rect x="400" y="140" width="100" height="120" fill="#1a3050" stroke="#3a2a18" stroke-width="4"/>
      <rect x="448" y="140" width="4" height="120" fill="#3a2a18"/>
      <rect x="400" y="198" width="100" height="4" fill="#3a2a18"/>
      <rect x="410" y="150" width="32" height="44" fill="#2a5080" opacity="0.5"/>

      <!-- Fireplace -->
      <rect x="680" y="220" width="120" height="200" fill="#2a1a0e"/>
      <rect x="690" y="320" width="100" height="100" fill="#0a0500"/>
      <rect x="700" y="360" width="30" height="30" fill="#ff5500" opacity="0.6"/>
      <rect x="730" y="350" width="20" height="40" fill="#ff8800" opacity="0.4"/>
      <rect x="750" y="365" width="25" height="25" fill="#ff5500" opacity="0.5"/>
      <rect x="680" y="210" width="120" height="16" fill="#3a2a18"/>

      <!-- Bed -->
      <rect x="200" y="340" width="140" height="80" fill="#4a3020"/>
      <rect x="200" y="330" width="140" height="16" fill="#cc8844"/>
      <rect x="200" y="330" width="50" height="90" fill="#886644"/>
      <rect x="210" y="340" width="30" height="10" fill="#fff" opacity="0.3"/>

      <!-- Table with items -->
      <rect x="500" y="360" width="100" height="60" fill="#3a2818"/>
      <rect x="500" y="352" width="100" height="12" fill="#4a3420"/>
      <rect x="520" y="340" width="20" height="16" fill="#888" opacity="0.5"/>
      <rect x="560" y="338" width="12" height="16" fill="${ac}" opacity="0.6"/>

      <!-- Trophy on wall -->
      <rect x="580" y="160" width="60" height="60" fill="#2a2218" stroke="#444" stroke-width="2"/>
      <rect x="598" y="170" width="24" height="24" fill="${ac}" opacity="0.4"/>

      <!-- Plants -->
      <rect x="870" y="380" width="20" height="40" fill="#553322"/>
      <rect x="860" y="360" width="40" height="24" fill="#44aa44" opacity="0.6"/>
      <rect x="868" y="348" width="24" height="16" fill="#55cc55" opacity="0.5"/>

      <!-- Housing UI overlay -->
      <rect x="150" y="100" width="900" height="40" fill="#000" opacity="0.6"/>
      <text x="600" y="126" font-family="monospace" font-size="18" fill="${ac}" text-anchor="middle" font-weight="bold">Manor - Plot #7 | Storage: 14/20</text>

      <!-- Furniture palette -->
      <rect x="150" y="${H - 100}" width="900" height="70" rx="4" fill="#000" opacity="0.7"/>
      <text x="170" y="${H - 72}" font-family="monospace" font-size="11" fill="#888">Furniture:</text>
      ${['Bed', 'Table', 'Chair', 'Lamp', 'Chest', 'Banner', 'Plant', 'Clock'].map((f, i) => `
        <rect x="${280 + i * 88}" y="${H - 90}" width="72" height="50" rx="3" fill="#1a1a1a" stroke="${i === 0 ? ac : '#333'}" stroke-width="1"/>
        <text x="${316 + i * 88}" y="${H - 58}" font-family="monospace" font-size="10" fill="#888" text-anchor="middle">${f}</text>
      `).join('')}
    `;
  }

  if (feature === 'fishing-system') {
    // Coastal fishing scene
    // Water
    content += `<rect x="0" y="350" width="${W}" height="325" fill="#0a2a40"/>`;
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(rand() * W);
      const y = 360 + Math.floor(rand() * 200);
      content += `<rect x="${x}" y="${y}" width="${30 + Math.floor(rand() * 50)}" height="3" fill="${ac}" opacity="0.15"/>`;
    }
    // Shore
    for (let col = 0; col < 50; col++) {
      const x = col * 24;
      content += `<rect x="${x}" y="320" width="24" height="40" fill="${rand() > 0.5 ? '#3a3020' : '#2a2418'}"/>`;
    }
    // Sky
    content += `<rect x="0" y="0" width="${W}" height="320" fill="#0a1828"/>`;
    content += `<rect x="0" y="0" width="${W}" height="200" fill="#0e2040"/>`;

    // Player on shore
    content += generatePlayerSprite(300, 278, 0x22aacc);

    // Fishing rod
    content += `<line x1="336" y1="280" x2="500" y2="200" stroke="#8a6a40" stroke-width="3"/>`;
    content += `<line x1="500" y1="200" x2="520" y2="360" stroke="#aaa" stroke-width="1" stroke-dasharray="4,4"/>`;
    // Bobber
    content += `<circle cx="520" cy="358" r="6" fill="#ff4444"/>`;
    content += `<circle cx="520" cy="356" r="3" fill="#fff" opacity="0.4"/>`;
    // Splash
    content += `<rect x="510" y="350" width="4" height="8" fill="${ac}" opacity="0.4"/>`;
    content += `<rect x="528" y="352" width="3" height="6" fill="${ac}" opacity="0.3"/>`;

    // Exclamation - fish biting!
    content += `<text x="530" y="340" font-family="monospace" font-size="24" fill="#ffdd44" font-weight="bold">!</text>`;

    // Fishing UI
    content += `
      <rect x="350" y="80" width="500" height="180" rx="6" fill="#0a1828" stroke="${ac}" stroke-width="2" opacity="0.95"/>
      <text x="600" y="110" font-family="monospace" font-size="18" fill="${ac}" text-anchor="middle" font-weight="bold">Fish On!</text>

      <!-- Tension bar -->
      <text x="370" y="140" font-family="monospace" font-size="12" fill="#888">Tension:</text>
      <rect x="450" y="128" width="380" height="18" fill="#0a1828" stroke="#334455" stroke-width="1"/>
      <rect x="451" y="129" width="240" height="16" fill="#22aa66"/>
      <rect x="691" y="128" width="4" height="18" fill="#ff4444"/>
      <text x="640" y="142" font-family="monospace" font-size="10" fill="#fff" text-anchor="middle">63%</text>

      <!-- Catch preview -->
      <rect x="370" y="160" width="80" height="80" rx="4" fill="#0e2040" stroke="#334455" stroke-width="1"/>
      <text x="410" y="200" font-family="monospace" font-size="24" fill="${ac}" text-anchor="middle">?</text>
      <text x="470" y="190" font-family="monospace" font-size="14" fill="#fff">Rare catch detected!</text>
      <text x="470" y="210" font-family="monospace" font-size="11" fill="#888">Saltmarsh Harbor - Coastal waters</text>
      <text x="470" y="230" font-family="monospace" font-size="11" fill="#44aa44">Fish Journal: 12 / 38 species</text>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="image-rendering: pixelated;">
  <defs><style>text { font-family: monospace; }</style></defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect width="${W}" height="${H}" fill="${bgL}" opacity="0.3"/>
  ${content}
  <!-- Title banner -->
  <rect x="0" y="${H - 55}" width="${W}" height="55" fill="#000" opacity="0.7"/>
  <text x="24" y="${H - 22}" font-family="monospace" font-size="22" fill="${ac}" font-weight="bold">${cfg.title}</text>
  <text x="24" y="${H - 6}" font-family="monospace" font-size="12" fill="#888">${cfg.subtitle}</text>
  <text x="${W - 24}" y="${H - 12}" font-family="monospace" font-size="11" fill="#555" text-anchor="end">PixelRealm MMORPG</text>
</svg>`;
}

// Main generation
const outDir = path.join(__dirname, '..', 'assets', 'screenshots');
const zonesDir = path.join(outDir, 'zones');
const featuresDir = path.join(outDir, 'features');

fs.mkdirSync(zonesDir, { recursive: true });
fs.mkdirSync(featuresDir, { recursive: true });

// Generate zone screenshots
console.log('Generating zone walkthrough screenshots...');
ZONES.forEach(zone => {
  const filename = `walkthrough_${zone.id}_${zone.name.toLowerCase().replace(/\s+/g, '_')}.svg`;
  const filepath = path.join(zonesDir, filename);
  fs.writeFileSync(filepath, generateZoneScreenshot(zone));
  console.log(`  [OK] ${filename}`);
});

// Generate feature screenshots
console.log('\nGenerating feature showcase screenshots...');
const features = [
  'class-selection', 'combat-system', 'crafting-station',
  'guild-territory', 'pvp-arena', 'player-housing', 'fishing-system'
];
features.forEach(feature => {
  const filename = `feature_${feature}.svg`;
  const filepath = path.join(featuresDir, filename);
  fs.writeFileSync(filepath, generateFeatureScreenshot(feature));
  console.log(`  [OK] ${filename}`);
});

console.log(`\nDone! Generated ${ZONES.length} zone + ${features.length} feature screenshots.`);
console.log(`Output: ${outDir}`);
