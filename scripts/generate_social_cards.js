/**
 * Generate social media cards (1200x630) for v1.3.0 features
 * Each card: feature vignette + title + branding
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PAL = {
  shadowBlack: '#0d0d0d', darkRock: '#2b2b2b', stoneGray: '#4a4a4a',
  midGray: '#6e6e6e', lightStone: '#969696', paleGray: '#c8c8c8', nearWhite: '#f0f0f0',
  deepSoil: '#3b2010', richEarth: '#6b3a1f', dirt: '#8b5c2a',
  sand: '#b8843f', desertGold: '#d4a85a', paleSand: '#e8d08a',
  deepForest: '#1a3a1a', forestGreen: '#2d6e2d', leafGreen: '#4c9b4c',
  brightGrass: '#78c878', lightFoliage: '#a8e4a0',
  deepOcean: '#0a1a3a', oceanBlue: '#1a4a8a', skyBlue: '#2a7ac0',
  playerBlue: '#50a8e8', iceBlue: '#90d0f8', shimmer: '#c8f0ff',
  deepBlood: '#5a0a0a', enemyRed: '#a01010', brightRed: '#d42020',
  fireOrange: '#f06020', ember: '#f8a060',
  darkGold: '#a87000', gold: '#e8b800', brightYellow: '#ffe040', paleHighlight: '#fff8a0',
  deepMagic: '#1a0a3a', magicPurple: '#5a20a0', manaViolet: '#9050e0', spellGlow: '#d090ff',
};

const W = 1200, H = 630;

function r(x, y, w, h, fill, opacity) {
  const op = opacity !== undefined ? ` opacity="${opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${op}/>`;
}

function t(x, y, content, fill, size, anchor = 'start', extra = '') {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="monospace" font-size="${size}" text-anchor="${anchor}"${extra ? ' ' + extra : ''}>${content}</text>`;
}

function cardFrame(bgColor, title, subtitle, featureContent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    ${r(0, 0, W, H, bgColor)}
    ${featureContent}
    <!-- Bottom branding bar -->
    ${r(0, H - 100, W, 100, PAL.shadowBlack, 0.9)}
    ${r(0, H - 100, W, 3, PAL.gold)}
    <!-- Logo text -->
    ${t(40, H - 55, 'PIXEL', PAL.playerBlue, 28, 'start', 'letter-spacing="3"')}
    ${t(175, H - 55, 'REALM', PAL.brightYellow, 28, 'start', 'letter-spacing="3"')}
    ${t(40, H - 30, 'PIXELATED MMORPG ADVENTURE', PAL.lightStone, 12, 'start', 'letter-spacing="2"')}
    <!-- Version badge -->
    ${r(W - 200, H - 80, 170, 28, PAL.deepForest, 0.8)}
    ${r(W - 200, H - 80, 170, 2, PAL.leafGreen)}
    ${t(W - 115, H - 60, 'v1.3.0 UPDATE', PAL.brightGrass, 12, 'middle', 'letter-spacing="2"')}
    <!-- Title area -->
    ${r(0, 0, W, 90, PAL.shadowBlack, 0.7)}
    ${r(0, 87, W, 3, PAL.gold)}
    ${t(40, 45, title, PAL.brightYellow, 32, 'start', 'letter-spacing="4"')}
    ${t(40, 72, subtitle, PAL.lightStone, 14, 'start', 'letter-spacing="2"')}
    <!-- Gold border -->
    ${r(0, 0, W, 5, PAL.gold)}${r(0, H - 5, W, 5, PAL.gold)}
    ${r(0, 0, 5, H, PAL.gold)}${r(W - 5, 0, 5, H, PAL.gold)}
  </svg>`;
}

function socialHousing() {
  const content = `
    <!-- Interior scene -->
    ${r(0, 90, W, H - 190, PAL.desertGold, 0.15)}
    <!-- Floor -->
    ${r(0, 350, W, 180, PAL.dirt)}
    ${r(0, 350, W, 5, PAL.sand)}
    ${Array.from({length: 25}, (_, i) => r(i * 48, 350, 2, 180, PAL.richEarth, 0.2)).join('')}
    <!-- Walls -->
    ${r(0, 90, W, 180, PAL.sand, 0.6)}
    ${r(0, 260, W, 6, PAL.richEarth)}
    <!-- Wallpaper stripe -->
    ${r(0, 160, W, 4, PAL.darkGold, 0.4)}
    ${r(0, 240, W, 4, PAL.darkGold, 0.4)}

    <!-- Cottage exterior (left third) -->
    <g transform="translate(50, 120)">
      ${r(20, 80, 150, 100, PAL.dirt)}
      ${r(20, 80, 150, 6, PAL.sand)}
      <polygon points="20,80 95,30 170,80" fill="${PAL.enemyRed}"/>
      <polygon points="25,80 95,35 165,80" fill="${PAL.brightRed}" opacity="0.6"/>
      ${r(70, 110, 40, 70, PAL.deepSoil)}
      ${r(85, 135, 8, 8, PAL.gold)}
      ${r(30, 100, 30, 25, PAL.iceBlue)}
      ${r(130, 100, 30, 25, PAL.iceBlue)}
      ${r(44, 100, 2, 25, PAL.richEarth)}
      ${r(30, 112, 30, 2, PAL.richEarth)}
      ${r(144, 100, 2, 25, PAL.richEarth)}
      ${r(130, 112, 30, 2, PAL.richEarth)}
      <!-- Chimney -->
      ${r(130, 40, 15, 45, PAL.stoneGray)}
      ${r(128, 36, 19, 6, PAL.midGray)}
      ${r(135, 28, 5, 10, PAL.paleGray, 0.4)}
      ${r(138, 20, 4, 10, PAL.paleGray, 0.25)}
      <!-- Flower boxes -->
      ${r(28, 128, 34, 6, PAL.richEarth)}
      ${r(32, 124, 6, 6, PAL.brightRed)}
      ${r(42, 122, 6, 6, PAL.brightYellow)}
      ${r(52, 124, 6, 6, PAL.manaViolet)}
    </g>

    <!-- Interior view (right two-thirds) -->
    <g transform="translate(400, 110)">
      <!-- Room frame -->
      ${r(0, 0, 700, 370, PAL.shadowBlack, 0.3)}
      <!-- Paintings on wall -->
      ${r(40, 30, 50, 40, PAL.richEarth)}${r(44, 34, 42, 32, PAL.skyBlue)}
      ${r(44, 50, 42, 14, PAL.brightGrass, 0.5)}
      ${r(250, 25, 60, 45, PAL.richEarth)}${r(254, 29, 52, 37, PAL.fireOrange, 0.3)}
      <!-- Fireplace -->
      ${r(450, 50, 80, 100, PAL.stoneGray)}
      ${r(460, 80, 60, 65, PAL.shadowBlack)}
      ${r(465, 110, 15, 20, PAL.fireOrange, 0.8)}
      ${r(480, 105, 15, 25, PAL.brightRed, 0.7)}
      ${r(495, 110, 10, 20, PAL.brightYellow, 0.6)}
      ${r(448, 48, 84, 6, PAL.richEarth)}
      <!-- Table -->
      ${r(130, 160, 100, 10, PAL.dirt)}
      ${r(140, 170, 8, 40, PAL.richEarth)}
      ${r(212, 170, 8, 40, PAL.richEarth)}
      <!-- Chair -->
      ${r(110, 150, 20, 30, PAL.enemyRed, 0.5)}
      ${r(110, 180, 6, 30, PAL.richEarth)}
      ${r(124, 180, 6, 30, PAL.richEarth)}
      <!-- Bed -->
      ${r(550, 150, 100, 50, PAL.oceanBlue)}
      ${r(550, 145, 100, 8, PAL.nearWhite)}
      ${r(545, 140, 8, 65, PAL.richEarth)}
      ${r(652, 140, 8, 65, PAL.richEarth)}
      <!-- Rug -->
      ${r(250, 230, 120, 60, PAL.enemyRed, 0.4)}
      ${r(260, 240, 100, 40, PAL.darkGold, 0.3)}
      <!-- Potted plant -->
      ${r(30, 170, 20, 25, PAL.richEarth)}
      ${r(25, 145, 30, 30, PAL.brightGrass)}
      ${r(30, 135, 20, 15, PAL.leafGreen)}
      <!-- Bookshelf -->
      ${r(330, 40, 70, 110, PAL.richEarth)}
      ${r(335, 45, 60, 8, PAL.enemyRed, 0.5)}
      ${r(335, 60, 30, 8, PAL.oceanBlue, 0.5)}${r(367, 60, 25, 8, PAL.leafGreen, 0.5)}
      ${r(335, 75, 50, 8, PAL.brightYellow, 0.3)}
      ${r(335, 90, 20, 8, PAL.manaViolet, 0.4)}${r(358, 90, 35, 8, PAL.dirt)}
      ${r(335, 105, 55, 8, PAL.enemyRed, 0.3)}
      ${r(335, 120, 40, 8, PAL.oceanBlue, 0.3)}
      <!-- Player character in room -->
      ${r(270, 170, 24, 30, PAL.playerBlue)}
      ${r(274, 155, 16, 18, PAL.ember)}
      ${r(278, 160, 5, 4, PAL.shadowBlack)}
      ${r(270, 200, 10, 12, PAL.oceanBlue)}
      ${r(284, 200, 10, 12, PAL.oceanBlue)}
    </g>

    <!-- Edit mode UI -->
    ${r(450, 430, 200, 36, PAL.shadowBlack, 0.85)}
    ${r(452, 432, 196, 32, PAL.deepOcean, 0.4)}
    ${t(550, 454, 'EDIT MODE  [E]', PAL.brightYellow, 14, 'middle')}
    ${r(670, 430, 180, 36, PAL.shadowBlack, 0.85)}
    ${r(672, 432, 176, 32, PAL.deepForest, 0.4)}
    ${t(760, 454, 'FURNITURE  [F]', PAL.brightGrass, 14, 'middle')}
  `;
  return cardFrame(PAL.deepSoil, 'PLAYER HOUSING', 'Build and decorate your dream home', content);
}

function socialMounts() {
  const content = `
    <!-- Sky -->
    ${r(0, 90, W, 300, PAL.skyBlue)}
    ${r(100, 120, 100, 25, PAL.nearWhite, 0.3)}
    ${r(90, 128, 120, 15, PAL.nearWhite, 0.2)}
    ${r(800, 110, 80, 20, PAL.nearWhite, 0.25)}
    <!-- Mountains -->
    <polygon points="0,380 200,180 400,380" fill="${PAL.iceBlue}" opacity="0.25"/>
    <polygon points="300,380 550,200 800,380" fill="${PAL.iceBlue}" opacity="0.2"/>
    <polygon points="700,380 950,220 1200,380" fill="${PAL.iceBlue}" opacity="0.22"/>
    <!-- Ground -->
    ${r(0, 380, W, 150, PAL.brightGrass)}
    ${r(0, 380, W, 5, PAL.lightFoliage)}
    ${r(0, 420, W, 110, PAL.leafGreen)}
    ${r(0, 460, W, 70, PAL.forestGreen)}
    <!-- Path -->
    ${r(0, 400, W, 30, PAL.dirt, 0.7)}
    ${r(0, 400, W, 3, PAL.sand, 0.5)}

    <!-- Mount 1: War Horse (left) -->
    <g transform="translate(80, 310)">
      ${r(0, 20, 65, 32, PAL.richEarth)}
      ${r(55, 5, 20, 22, PAL.richEarth)}
      ${r(68, 8, 4, 4, PAL.shadowBlack)}
      ${r(52, 2, 5, 8, PAL.richEarth)}${r(60, 2, 5, 8, PAL.richEarth)}
      ${r(50, 3, 5, 20, PAL.deepSoil)}
      ${r(5, 52, 8, 20, PAL.deepSoil)}${r(18, 52, 8, 20, PAL.deepSoil)}
      ${r(40, 52, 8, 20, PAL.deepSoil)}${r(53, 52, 8, 20, PAL.deepSoil)}
      ${r(15, 14, 28, 8, PAL.enemyRed)}
      <!-- Rider -->
      ${r(22, -5, 18, 22, PAL.playerBlue)}
      ${r(26, -18, 12, 14, PAL.ember)}
      ${r(29, -14, 4, 3, PAL.shadowBlack)}
      ${t(40, 85, 'War Horse', PAL.nearWhite, 10, 'middle')}
    </g>

    <!-- Mount 2: Frost Elk (center-left) -->
    <g transform="translate(300, 300)">
      ${r(0, 20, 60, 30, PAL.iceBlue)}
      ${r(50, 0, 18, 25, PAL.iceBlue)}
      ${r(62, 3, 4, 4, PAL.shadowBlack)}
      ${r(48, -15, 6, 18, PAL.shimmer)}${r(58, -18, 6, 20, PAL.shimmer)}
      ${r(52, -20, 3, 8, PAL.shimmer)}${r(60, -22, 3, 10, PAL.shimmer)}
      ${r(5, 50, 6, 22, PAL.skyBlue)}${r(18, 50, 6, 22, PAL.skyBlue)}
      ${r(38, 50, 6, 22, PAL.skyBlue)}${r(50, 50, 6, 22, PAL.skyBlue)}
      <!-- Ice particles -->
      ${r(-5, 25, 4, 4, PAL.shimmer, 0.5)}${r(-10, 35, 3, 3, PAL.shimmer, 0.3)}
      <!-- Rider -->
      ${r(18, -2, 18, 22, PAL.manaViolet)}
      ${r(22, -15, 12, 14, PAL.ember)}
      ${t(35, 85, 'Frost Elk', PAL.shimmer, 10, 'middle')}
    </g>

    <!-- Mount 3: Shadow Wolf (center) -->
    <g transform="translate(530, 315)">
      ${r(0, 15, 55, 25, PAL.stoneGray)}
      ${r(45, 2, 16, 20, PAL.stoneGray)}
      ${r(55, 5, 4, 3, PAL.brightYellow)}
      ${r(42, -5, 6, 10, PAL.midGray)}${r(52, -5, 6, 10, PAL.midGray)}
      ${r(5, 40, 6, 18, PAL.darkRock)}${r(16, 40, 6, 18, PAL.darkRock)}
      ${r(34, 40, 6, 18, PAL.darkRock)}${r(45, 40, 6, 18, PAL.darkRock)}
      ${r(-5, 20, 8, 12, PAL.midGray)}
      <!-- Rider -->
      ${r(15, -5, 18, 22, PAL.forestGreen)}
      ${r(19, -18, 12, 14, PAL.ember)}
      ${t(30, 72, 'Shadow Wolf', PAL.lightStone, 10, 'middle')}
    </g>

    <!-- Mount 4: Crystal Drake (right) -->
    <g transform="translate(760, 290)">
      ${r(5, 20, 60, 35, PAL.manaViolet)}
      ${r(55, 5, 20, 25, PAL.manaViolet)}
      ${r(68, 10, 5, 4, PAL.brightYellow)}
      ${r(5, 15, 8, 15, PAL.spellGlow, 0.5)}${r(-5, 20, 12, 8, PAL.spellGlow, 0.3)}
      ${r(10, 55, 8, 20, PAL.magicPurple)}${r(25, 55, 8, 20, PAL.magicPurple)}
      ${r(42, 55, 8, 20, PAL.magicPurple)}${r(55, 55, 8, 18, PAL.magicPurple)}
      ${r(-10, 25, 15, 6, PAL.spellGlow, 0.4)}
      <!-- Sparkles -->
      ${r(20, 5, 4, 4, PAL.shimmer, 0.6)}${r(45, 0, 3, 3, PAL.shimmer, 0.4)}
      ${r(70, 18, 3, 3, PAL.paleHighlight, 0.5)}
      <!-- Rider -->
      ${r(20, 0, 18, 22, PAL.brightYellow)}
      ${r(24, -13, 12, 14, PAL.ember)}
      ${t(40, 88, 'Crystal Drake', PAL.spellGlow, 10, 'middle')}
    </g>

    <!-- Mount 5: Desert Raptor (far right) -->
    <g transform="translate(990, 320)">
      ${r(0, 12, 45, 25, PAL.desertGold)}
      ${r(35, 0, 15, 18, PAL.desertGold)}
      ${r(44, 4, 4, 3, PAL.shadowBlack)}
      ${r(42, 15, 8, 5, PAL.darkGold)}
      ${r(8, 37, 6, 20, PAL.darkGold)}${r(25, 37, 6, 20, PAL.darkGold)}
      ${r(-5, 20, 8, 8, PAL.sand)}
      <!-- Rider -->
      ${r(10, -5, 18, 18, PAL.fireOrange)}
      ${r(14, -16, 12, 12, PAL.ember)}
      ${t(25, 70, 'Raptor', PAL.sand, 10, 'middle')}
    </g>
  `;
  return cardFrame(PAL.deepOcean, 'MOUNT SYSTEM', 'Collect and ride unique mounts across the realm', content);
}

function socialFishing() {
  const content = `
    <!-- Water scene -->
    ${r(0, 90, W, 440, PAL.oceanBlue)}
    ${r(0, 200, W, 330, PAL.deepOcean, 0.3)}
    <!-- Surface shimmer -->
    ${r(100, 210, 60, 3, PAL.skyBlue, 0.3)}${r(300, 220, 80, 3, PAL.skyBlue, 0.25)}
    ${r(600, 215, 70, 3, PAL.skyBlue, 0.3)}${r(900, 225, 50, 3, PAL.skyBlue, 0.2)}
    <!-- Sunset sky -->
    ${r(0, 90, W, 120, PAL.skyBlue, 0.4)}
    ${r(0, 180, W, 30, PAL.fireOrange, 0.15)}
    <!-- Shore -->
    ${r(0, 190, 500, 25, PAL.brightGrass)}
    ${r(0, 190, 500, 4, PAL.lightFoliage)}
    ${r(0, 210, 450, 10, PAL.dirt)}

    <!-- Large dock -->
    ${r(300, 200, 250, 18, PAL.dirt)}
    ${r(300, 200, 250, 4, PAL.sand)}
    ${r(310, 210, 10, 60, PAL.richEarth)}
    ${r(420, 210, 10, 60, PAL.richEarth)}
    ${r(540, 210, 10, 60, PAL.richEarth)}

    <!-- Player fishing -->
    <g transform="translate(400, 150)">
      ${r(5, 15, 24, 28, PAL.playerBlue)}
      ${r(9, 0, 16, 18, PAL.ember)}
      ${r(13, 5, 5, 4, PAL.shadowBlack)}
      ${r(5, 43, 10, 14, PAL.oceanBlue)}
      ${r(19, 43, 10, 14, PAL.oceanBlue)}
      <!-- Hat -->
      ${r(3, -3, 22, 6, PAL.dirt)}
      ${r(7, -8, 14, 7, PAL.sand)}
    </g>
    <!-- Fishing rod -->
    <line x1="430" y1="148" x2="520" y2="120" stroke="${PAL.dirt}" stroke-width="4"/>
    <line x1="520" y1="120" x2="750" y2="320" stroke="${PAL.paleGray}" stroke-width="2"/>
    <!-- Bobber -->
    ${r(745, 205, 12, 12, PAL.brightRed)}
    ${r(747, 200, 8, 6, PAL.nearWhite)}

    <!-- Fish showcase (underwater) -->
    <!-- Fish 1 -->
    <g transform="translate(150, 300)">
      ${r(0, 0, 40, 18, PAL.skyBlue)}
      ${r(35, 3, 14, 12, PAL.skyBlue)}
      ${r(5, 5, 5, 4, PAL.shadowBlack)}
      ${r(20, 5, 15, 3, PAL.shimmer, 0.4)}
      ${t(20, 35, 'Forest Bass', PAL.iceBlue, 10, 'middle')}
    </g>
    <!-- Fish 2 -->
    <g transform="translate(350, 350)">
      ${r(0, 0, 50, 22, PAL.brightRed, 0.6)}
      ${r(44, 3, 16, 16, PAL.brightRed, 0.5)}
      ${r(6, 6, 5, 4, PAL.brightYellow)}
      ${r(15, 3, 8, 4, PAL.fireOrange, 0.5)}
      ${t(25, 40, 'Lava Guppy', PAL.fireOrange, 10, 'middle')}
    </g>
    <!-- Fish 3 (legendary) -->
    <g transform="translate(600, 330)">
      ${r(0, 5, 60, 25, PAL.gold)}
      ${r(55, 8, 18, 18, PAL.brightYellow)}
      ${r(8, 12, 6, 5, PAL.shadowBlack)}
      ${r(20, 8, 20, 4, PAL.shimmer, 0.6)}
      ${r(-5, 0, 4, 4, PAL.brightYellow, 0.5)}${r(65, 2, 3, 3, PAL.brightYellow, 0.4)}
      ${r(-8, 15, 3, 3, PAL.paleHighlight, 0.3)}${r(70, 20, 3, 3, PAL.paleHighlight, 0.3)}
      ${t(30, 50, 'Golden Leviathan', PAL.brightYellow, 10, 'middle')}
      ${t(30, 62, 'LEGENDARY', PAL.gold, 8, 'middle')}
    </g>
    <!-- Fish 4 -->
    <g transform="translate(880, 290)">
      ${r(0, 0, 35, 16, PAL.leafGreen, 0.6)}
      ${r(30, 2, 12, 12, PAL.leafGreen, 0.5)}
      ${r(4, 4, 4, 3, PAL.shadowBlack)}
      ${t(18, 30, 'River Perch', PAL.brightGrass, 10, 'middle')}
    </g>

    <!-- Bubbles -->
    ${r(200, 270, 6, 6, PAL.shimmer, 0.3)}
    ${r(500, 310, 5, 5, PAL.shimmer, 0.25)}
    ${r(800, 280, 4, 4, PAL.shimmer, 0.2)}
    ${r(700, 400, 8, 8, PAL.iceBlue, 0.2)}

    <!-- Splash at bobber -->
    ${r(740, 198, 5, 6, PAL.shimmer, 0.5)}
    ${r(760, 196, 5, 6, PAL.shimmer, 0.4)}
    ${r(750, 193, 4, 5, PAL.iceBlue, 0.6)}

    <!-- Tackle box -->
    <g transform="translate(330, 188)">
      ${r(0, 0, 30, 20, PAL.stoneGray)}
      ${r(2, 2, 26, 16, PAL.midGray)}
      ${r(5, 5, 6, 6, PAL.brightRed)}
      ${r(15, 5, 6, 6, PAL.leafGreen)}
      ${r(10, -3, 10, 5, PAL.stoneGray)}
    </g>

    <!-- Trees on shore -->
    <polygon points="50,190 85,110 120,190" fill="${PAL.forestGreen}"/>
    <polygon points="140,190 170,120 200,190" fill="${PAL.deepForest}"/>
    ${r(80, 190, 12, 30, PAL.richEarth)}
    ${r(165, 190, 12, 30, PAL.richEarth)}
  `;
  return cardFrame(PAL.deepOcean, 'FISHING', 'Cast your line and discover rare catches', content);
}

function socialAuction() {
  const content = `
    <!-- Interior -->
    ${r(0, 90, W, 440, PAL.deepSoil)}
    ${r(0, 380, W, 150, PAL.dirt)}
    ${r(0, 380, W, 4, PAL.sand)}

    <!-- Grand hall -->
    ${r(0, 90, W, 200, PAL.sand, 0.5)}
    ${r(0, 280, W, 6, PAL.richEarth)}
    ${r(0, 140, W, 4, PAL.darkGold, 0.3)}
    ${r(0, 260, W, 4, PAL.darkGold, 0.3)}

    <!-- Columns -->
    ${[100, 300, 500, 700, 900, 1100].map(x => r(x, 90, 15, 200, PAL.paleGray, 0.5) + r(x - 3, 90, 21, 10, PAL.lightStone, 0.4) + r(x - 3, 280, 21, 10, PAL.lightStone, 0.4)).join('')}

    <!-- Banners -->
    ${r(180, 110, 50, 80, PAL.enemyRed, 0.6)}${r(192, 120, 26, 20, PAL.gold, 0.5)}
    ${r(580, 110, 50, 80, PAL.oceanBlue, 0.6)}${r(592, 120, 26, 20, PAL.gold, 0.5)}
    ${r(980, 110, 50, 80, PAL.manaViolet, 0.6)}${r(992, 120, 26, 20, PAL.gold, 0.5)}

    <!-- Auction counter -->
    ${r(350, 310, 500, 60, PAL.richEarth)}
    ${r(350, 310, 500, 6, PAL.sand)}

    <!-- Auctioneer -->
    <g transform="translate(570, 240)">
      ${r(5, 15, 30, 25, PAL.darkGold)}
      ${r(10, 0, 20, 18, PAL.ember)}
      ${r(15, 5, 5, 4, PAL.shadowBlack)}
      ${r(5, 40, 12, 12, PAL.richEarth)}
      ${r(23, 40, 12, 12, PAL.richEarth)}
      ${r(35, 20, 15, 5, PAL.dirt)}
    </g>

    <!-- Item displays on counter -->
    ${r(380, 290, 24, 24, PAL.deepSoil)}${r(382, 292, 20, 20, PAL.brightRed, 0.4)}
    ${r(420, 290, 24, 24, PAL.deepSoil)}${r(422, 292, 20, 20, PAL.gold, 0.4)}
    ${r(460, 290, 24, 24, PAL.deepSoil)}${r(462, 292, 20, 20, PAL.manaViolet, 0.4)}
    ${r(720, 290, 24, 24, PAL.deepSoil)}${r(722, 292, 20, 20, PAL.skyBlue, 0.4)}
    ${r(760, 290, 24, 24, PAL.deepSoil)}${r(762, 292, 20, 20, PAL.leafGreen, 0.4)}

    <!-- Players browsing -->
    <g transform="translate(200, 340)">
      ${r(5, 10, 20, 22, PAL.playerBlue)}${r(8, 0, 14, 12, PAL.ember)}
      ${r(11, 3, 4, 3, PAL.shadowBlack)}
      ${r(5, 32, 8, 10, PAL.oceanBlue)}${r(17, 32, 8, 10, PAL.oceanBlue)}
    </g>
    <g transform="translate(900, 340)">
      ${r(5, 10, 20, 22, PAL.forestGreen)}${r(8, 0, 14, 12, PAL.ember)}
      ${r(11, 3, 4, 3, PAL.shadowBlack)}
      ${r(5, 32, 8, 10, PAL.deepForest)}${r(17, 32, 8, 10, PAL.deepForest)}
    </g>

    <!-- Gold coins floating -->
    ${r(250, 300, 8, 8, PAL.gold, 0.6)}
    ${r(950, 310, 8, 8, PAL.brightYellow, 0.5)}
    ${r(320, 280, 6, 6, PAL.gold, 0.4)}
    ${r(880, 290, 6, 6, PAL.brightYellow, 0.3)}

    <!-- Price tags -->
    ${r(375, 275, 35, 14, PAL.shadowBlack, 0.7)}${t(392, 286, '850g', PAL.brightYellow, 8, 'middle')}
    ${r(455, 275, 40, 14, PAL.shadowBlack, 0.7)}${t(475, 286, '5,500g', PAL.brightYellow, 8, 'middle')}
    ${r(715, 275, 45, 14, PAL.shadowBlack, 0.7)}${t(737, 286, '12,000g', PAL.gold, 8, 'middle')}
  `;
  return cardFrame(PAL.deepSoil, 'AUCTION HOUSE', 'Trade items with players across the realm', content);
}

function socialDodgeCombat() {
  const content = `
    <!-- Dark forest -->
    ${r(0, 90, W, 440, PAL.deepForest)}
    ${r(0, 90, W, 50, PAL.shadowBlack, 0.3)}
    <!-- Ground -->
    ${r(0, 400, W, 130, PAL.deepForest)}
    ${r(0, 400, W, 5, PAL.forestGreen)}
    ${r(0, 440, W, 90, PAL.deepSoil)}
    <!-- Trees -->
    ${[0, 150, 950, 1100].map(x => `<polygon points="${x},400 ${x+40},250 ${x+80},400" fill="${PAL.forestGreen}" opacity="0.5"/>`).join('')}

    <!-- Player dodging (dynamic pose) -->
    <g transform="translate(420, 300) rotate(-25, 30, 40)">
      ${r(8, 18, 30, 28, PAL.playerBlue)}
      ${r(4, 14, 10, 8, PAL.shimmer)}
      ${r(12, 0, 18, 20, PAL.ember)}
      ${r(16, 6, 6, 4, PAL.shadowBlack)}
      ${r(8, 46, 12, 12, PAL.oceanBlue)}
      ${r(26, 46, 12, 12, PAL.oceanBlue)}
      <!-- Sword -->
      ${r(38, 10, 4, 30, PAL.lightStone)}
      ${r(36, 38, 8, 4, PAL.stoneGray)}
    </g>
    <!-- After-image trail -->
    ${r(520, 310, 30, 28, PAL.playerBlue, 0.12)}
    ${r(524, 298, 18, 18, PAL.ember, 0.1)}
    ${r(560, 315, 28, 26, PAL.playerBlue, 0.06)}

    <!-- Dodge VFX -->
    ${r(410, 330, 20, 20, PAL.shimmer, 0.5)}
    ${r(400, 340, 15, 15, PAL.nearWhite, 0.3)}
    ${r(420, 320, 12, 12, PAL.iceBlue, 0.4)}
    <!-- Dust -->
    ${r(480, 390, 25, 12, PAL.sand, 0.4)}
    ${r(500, 385, 20, 10, PAL.sand, 0.3)}
    ${r(515, 392, 15, 8, PAL.desertGold, 0.2)}

    <!-- DODGE! text -->
    ${t(470, 290, 'DODGE!', PAL.shimmer, 36, 'middle', 'font-weight="bold"')}

    <!-- Enemy 1: Orc with axe -->
    <g transform="translate(650, 285)">
      ${r(0, 20, 45, 38, PAL.forestGreen)}
      ${r(5, 0, 35, 25, PAL.leafGreen)}
      ${r(12, 8, 8, 6, PAL.brightRed)}
      ${r(25, 8, 8, 6, PAL.brightRed)}
      ${r(10, 18, 15, 5, PAL.shadowBlack)}
      ${r(8, 20, 5, 8, PAL.paleGray)}
      ${r(32, 20, 5, 8, PAL.paleGray)}
      ${r(5, 58, 14, 18, PAL.deepForest)}
      ${r(26, 58, 14, 18, PAL.deepForest)}
      <!-- Axe swing -->
      ${r(-40, 15, 45, 6, PAL.lightStone)}
      ${r(-48, 5, 18, 26, PAL.midGray)}
    </g>

    <!-- Enemy 2 -->
    <g transform="translate(850, 310)">
      ${r(0, 12, 35, 30, PAL.brightRed)}
      ${r(5, 0, 25, 16, PAL.enemyRed)}
      ${r(10, 5, 6, 5, PAL.brightYellow)}
      ${r(19, 5, 6, 5, PAL.brightYellow)}
      ${r(5, 42, 10, 16, PAL.deepBlood)}
      ${r(20, 42, 10, 16, PAL.deepBlood)}
    </g>

    <!-- Slash trail (missed attack) -->
    ${r(580, 300, 50, 4, PAL.nearWhite, 0.4)}
    ${r(590, 295, 40, 3, PAL.nearWhite, 0.25)}

    <!-- Combo counter -->
    ${r(100, 200, 150, 55, PAL.shadowBlack, 0.8)}
    ${t(120, 228, 'COMBO', PAL.fireOrange, 14)}
    ${t(200, 240, 'x12', PAL.brightYellow, 28)}

    <!-- Dodge meter -->
    ${r(450, 440, 300, 40, PAL.shadowBlack, 0.85)}
    ${r(460, 450, 100, 22, PAL.darkRock)}
    ${r(462, 452, 65, 18, PAL.playerBlue)}
    ${t(465, 465, 'DODGE', PAL.nearWhite, 10)}
    ${r(570, 452, 16, 18, PAL.leafGreen)}${r(590, 452, 16, 18, PAL.leafGreen)}${r(610, 452, 16, 18, PAL.darkRock)}
    ${t(640, 465, '2/3', PAL.lightStone, 12)}
  `;
  return cardFrame(PAL.shadowBlack, 'DODGE COMBAT', 'Roll, dodge, and counter-attack with precision', content);
}

function socialCosmetics() {
  const content = `
    ${r(0, 90, W, 440, PAL.deepMagic)}
    ${r(0, 90, W, 440, PAL.manaViolet, 0.08)}

    <!-- Decorative sparkles -->
    ${[80,200,350,500,700,850,1000,1120].map((x, i) => r(x, 120 + (i%3)*80, 4, 4, PAL.spellGlow, 0.3 + (i%3)*0.1)).join('')}

    <!-- Character display (center) -->
    ${r(450, 120, 300, 350, PAL.shadowBlack, 0.6)}
    ${r(452, 122, 296, 346, PAL.deepMagic, 0.3)}
    ${r(450, 120, 300, 3, PAL.gold, 0.5)}
    <!-- Character -->
    <g transform="translate(545, 180)">
      ${r(15, 45, 60, 70, PAL.manaViolet)}
      ${r(20, 50, 50, 10, PAL.spellGlow, 0.3)}
      ${r(25, 25, 40, 30, PAL.ember)}
      ${r(35, 35, 10, 6, PAL.shadowBlack)}
      ${r(50, 35, 10, 6, PAL.shadowBlack)}
      ${r(20, 10, 50, 20, PAL.gold)}
      ${r(25, 5, 40, 10, PAL.brightYellow)}
      ${r(15, 115, 25, 20, PAL.magicPurple)}
      ${r(50, 115, 25, 20, PAL.magicPurple)}
      <!-- Cape -->
      ${r(-5, 50, 15, 80, PAL.enemyRed, 0.6)}
      ${r(80, 50, 15, 80, PAL.enemyRed, 0.6)}
      <!-- Aura glow -->
      ${r(-15, 25, 120, 120, PAL.spellGlow, 0.08)}
      ${r(-10, 30, 110, 110, PAL.manaViolet, 0.06)}
    </g>
    ${t(600, 360, 'ARCANE SOVEREIGN', PAL.gold, 14, 'middle', 'letter-spacing="2"')}
    ${t(600, 380, 'Legendary Outfit', PAL.spellGlow, 10, 'middle')}

    <!-- Rotate buttons -->
    ${r(460, 400, 40, 30, PAL.darkRock, 0.5)}${t(480, 420, '&lt;', PAL.lightStone, 16, 'middle')}
    ${r(700, 400, 40, 30, PAL.darkRock, 0.5)}${t(720, 420, '&gt;', PAL.lightStone, 16, 'middle')}

    <!-- Dye palette (left) -->
    ${r(40, 130, 350, 280, PAL.shadowBlack, 0.7)}
    ${r(42, 132, 346, 276, PAL.deepMagic, 0.3)}
    ${r(42, 132, 346, 28, PAL.magicPurple, 0.4)}
    ${t(215, 152, 'DYE PALETTE', PAL.nearWhite, 12, 'middle', 'letter-spacing="2"')}

    <!-- Dye swatches -->
    ${[
      ['#0a1a3a','#1a4a8a','#2a7ac0','#50a8e8','#90d0f8','#c8f0ff'],
      ['#1a3a1a','#2d6e2d','#4c9b4c','#78c878','#a8e4a0','#e8d08a'],
      ['#5a0a0a','#a01010','#d42020','#f06020','#f8a060','#ffe040'],
      ['#1a0a3a','#5a20a0','#9050e0','#d090ff','#e8b800','#fff8a0'],
      ['#0d0d0d','#2b2b2b','#4a4a4a','#6e6e6e','#969696','#f0f0f0'],
    ].map((row, ri) =>
      row.map((c, ci) => {
        const selected = ri === 3 && ci === 2;
        const border = selected ? PAL.nearWhite : 'none';
        return r(60 + ci * 52, 170 + ri * 38, 42, 28, c) +
          (selected ? r(58 + ci * 52, 168 + ri * 38, 46, 32, 'none') + `<rect x="${58 + ci * 52}" y="${168 + ri * 38}" width="46" height="32" fill="none" stroke="${PAL.nearWhite}" stroke-width="2"/>` : '');
      }).join('')
    ).join('')}

    ${t(215, 380, 'Selected: Mana Violet', PAL.manaViolet, 10, 'middle')}
    ${r(100, 390, 230, 24, PAL.magicPurple, 0.4)}
    ${t(215, 407, 'APPLY DYE  -  200g', PAL.nearWhite, 10, 'middle')}

    <!-- Portrait frames (right) -->
    ${r(810, 130, 350, 280, PAL.shadowBlack, 0.7)}
    ${r(812, 132, 346, 276, PAL.deepMagic, 0.3)}
    ${r(812, 132, 346, 28, PAL.magicPurple, 0.4)}
    ${t(985, 152, 'PORTRAIT FRAMES', PAL.nearWhite, 12, 'middle', 'letter-spacing="2"')}

    <!-- Frame samples -->
    ${[
      { x: 0, y: 0, c: PAL.stoneGray, n: 'Iron' },
      { x: 1, y: 0, c: PAL.lightStone, n: 'Silver' },
      { x: 2, y: 0, c: PAL.gold, n: 'Gold' },
      { x: 0, y: 1, c: PAL.manaViolet, n: 'Amethyst' },
      { x: 1, y: 1, c: PAL.brightRed, n: 'Ruby' },
      { x: 2, y: 1, c: PAL.skyBlue, n: 'Sapphire' },
      { x: 0, y: 2, c: PAL.leafGreen, n: 'Emerald' },
      { x: 1, y: 2, c: PAL.brightYellow, n: 'Celestial' },
      { x: 2, y: 2, c: PAL.fireOrange, n: 'Infernal' },
    ].map(({x, y, c, n}) => {
      const bx = 835 + x * 105;
      const by = 175 + y * 80;
      return `<rect x="${bx}" y="${by}" width="75" height="55" fill="none" stroke="${c}" stroke-width="3"/>` +
        r(bx + 5, by + 5, 65, 35, PAL.deepMagic, 0.3) +
        r(bx + 20, by + 10, 35, 25, PAL.ember, 0.3) +
        t(bx + 37, by + 52, n, c, 8, 'middle');
    }).join('')}
  `;
  return cardFrame(PAL.deepMagic, 'COSMETIC SHOP', 'Customize your look with dyes, frames, and outfits', content);
}

async function generateAll() {
  const outputDir = path.join(__dirname, '..', 'assets', 'marketing');
  const cards = [
    { name: 'social_housing.png', fn: socialHousing },
    { name: 'social_mounts.png', fn: socialMounts },
    { name: 'social_fishing.png', fn: socialFishing },
    { name: 'social_auction.png', fn: socialAuction },
    { name: 'social_dodge_combat.png', fn: socialDodgeCombat },
    { name: 'social_cosmetics.png', fn: socialCosmetics },
  ];

  for (const { name, fn } of cards) {
    const svg = fn();
    const outPath = path.join(outputDir, name);
    try {
      await sharp(Buffer.from(svg)).png().toFile(outPath);
      const stats = fs.statSync(outPath);
      console.log(`Created: ${name} (${Math.round(stats.size / 1024)}KB)`);
    } catch (err) {
      console.error(`Failed: ${name} - ${err.message}`);
    }
  }
}

generateAll().then(() => console.log('\nAll social media cards generated.'));
