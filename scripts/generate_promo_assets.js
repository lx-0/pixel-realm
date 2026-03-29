/**
 * Generate v1.3.0 promotional art assets
 * Creates feature screenshots, social media cards, and montage
 * Uses the PixelRealm 32-color master palette and pixel art style
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Master palette
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

const W = 960, H = 540;

function rect(x, y, w, h, fill, opacity) {
  const op = opacity !== undefined ? ` opacity="${opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${op}/>`;
}

function text(x, y, content, fill, size, anchor = 'start', extra = '') {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="monospace" font-size="${size}" text-anchor="${anchor}"${extra ? ' ' + extra : ''}>${content}</text>`;
}

function stars(count = 20) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * W);
    const y = Math.floor(Math.random() * (H * 0.4));
    const sz = Math.random() > 0.7 ? 3 : 2;
    s += rect(x, y, sz, sz, PAL.nearWhite, 0.6 + Math.random() * 0.4);
  }
  return s;
}

// Pixel art HUD overlay used by gameplay screenshots
function hud() {
  return `
    <!-- HP bar -->
    ${rect(15, 15, 140, 14, PAL.shadowBlack, 0.8)}
    ${rect(17, 17, 90, 10, PAL.brightRed)}
    ${rect(17, 17, 136, 2, PAL.nearWhite, 0.15)}
    <!-- MP bar -->
    ${rect(15, 33, 140, 14, PAL.shadowBlack, 0.8)}
    ${rect(17, 35, 70, 10, PAL.manaViolet)}
    ${rect(17, 35, 136, 2, PAL.nearWhite, 0.15)}
    <!-- Level indicator -->
    ${rect(160, 15, 40, 14, PAL.shadowBlack, 0.8)}
    ${text(165, 26, 'L42', PAL.brightYellow, 10)}
    <!-- Minimap frame -->
    ${rect(W - 110, 15, 95, 95, PAL.shadowBlack, 0.7)}
    ${rect(W - 108, 17, 91, 91, PAL.deepOcean, 0.5)}
    ${rect(W - 65, 60, 4, 4, PAL.playerBlue)}
  `;
}

function goldBorder() {
  return `
    ${rect(0, 0, W, 4, PAL.gold)}
    ${rect(0, H - 4, W, 4, PAL.gold)}
    ${rect(0, 0, 4, H, PAL.gold)}
    ${rect(W - 4, 0, 4, H, PAL.gold)}
  `;
}

// Player character sprite
function playerChar(x, y, scale = 3) {
  const s = scale;
  return `<g transform="translate(${x},${y}) scale(${s})">
    ${rect(2, 0, 12, 8, PAL.ember)}
    ${rect(5, 2, 3, 2, PAL.shadowBlack)}
    ${rect(10, 2, 3, 2, PAL.shadowBlack)}
    ${rect(6, 6, 4, 2, PAL.shadowBlack)}
    ${rect(0, 8, 16, 12, PAL.playerBlue)}
    ${rect(3, 10, 4, 2, PAL.shimmer)}
    ${rect(0, 20, 6, 4, PAL.oceanBlue)}
    ${rect(10, 20, 6, 4, PAL.oceanBlue)}
  </g>`;
}

// Generate mount riding screenshot
function screenshotMountRiding() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Sky -->
    ${rect(0, 0, W, H, PAL.skyBlue)}
    ${rect(0, 0, W, 100, PAL.skyBlue)}
    <!-- Clouds -->
    ${rect(100, 60, 80, 20, PAL.nearWhite, 0.4)}
    ${rect(90, 65, 100, 15, PAL.nearWhite, 0.3)}
    ${rect(400, 40, 100, 20, PAL.nearWhite, 0.35)}
    ${rect(390, 45, 120, 12, PAL.nearWhite, 0.25)}
    ${rect(700, 70, 60, 15, PAL.nearWhite, 0.3)}

    <!-- Distant mountains -->
    <polygon points="0,350 150,200 300,350" fill="${PAL.iceBlue}" opacity="0.3"/>
    <polygon points="200,350 400,180 600,350" fill="${PAL.iceBlue}" opacity="0.25"/>
    <polygon points="500,350 700,220 900,350" fill="${PAL.iceBlue}" opacity="0.2"/>

    <!-- Ground - plains biome -->
    ${rect(0, 350, W, 190, PAL.brightGrass)}
    ${rect(0, 350, W, 6, PAL.lightFoliage)}
    ${rect(0, 400, W, 140, PAL.leafGreen)}
    ${rect(0, 450, W, 90, PAL.forestGreen)}

    <!-- Path/road -->
    ${rect(0, 370, W, 40, PAL.dirt)}
    ${rect(0, 370, W, 3, PAL.sand)}
    ${rect(0, 407, W, 3, PAL.richEarth)}

    <!-- Scattered flowers -->
    ${rect(50, 345, 4, 6, PAL.leafGreen)}${rect(50, 340, 4, 6, PAL.brightRed)}
    ${rect(200, 348, 4, 5, PAL.leafGreen)}${rect(200, 344, 4, 5, PAL.brightYellow)}
    ${rect(680, 343, 4, 6, PAL.leafGreen)}${rect(680, 339, 4, 5, PAL.manaViolet)}
    ${rect(850, 346, 4, 6, PAL.leafGreen)}${rect(850, 342, 4, 5, PAL.playerBlue)}

    <!-- Trees background -->
    <polygon points="30,350 60,280 90,350" fill="${PAL.forestGreen}"/>
    <polygon points="750,350 780,270 810,350" fill="${PAL.forestGreen}"/>
    <polygon points="870,350 900,290 930,350" fill="${PAL.forestGreen}"/>
    ${rect(55, 350, 10, 30, PAL.richEarth)}
    ${rect(775, 350, 10, 30, PAL.richEarth)}
    ${rect(895, 350, 10, 30, PAL.richEarth)}

    <!-- === MOUNTED PLAYER (center, moving right) === -->
    <g transform="translate(350, 310)">
      <!-- Horse body -->
      ${rect(0, 30, 75, 36, PAL.richEarth)}
      ${rect(0, 28, 75, 4, PAL.dirt)}
      <!-- Horse head -->
      ${rect(65, 10, 24, 28, PAL.richEarth)}
      ${rect(82, 4, 12, 14, PAL.richEarth)}
      ${rect(88, 7, 4, 4, PAL.shadowBlack)}
      <!-- Ears -->
      ${rect(83, 0, 4, 6, PAL.richEarth)}
      ${rect(89, 0, 4, 6, PAL.richEarth)}
      <!-- Mane -->
      ${rect(62, 8, 6, 30, PAL.deepSoil)}
      <!-- Legs (galloping pose) -->
      ${rect(8, 66, 9, 24, PAL.deepSoil)}
      ${rect(22, 66, 9, 20, PAL.deepSoil)}
      ${rect(48, 66, 9, 22, PAL.deepSoil)}
      ${rect(62, 66, 9, 18, PAL.deepSoil)}
      <!-- Hooves -->
      ${rect(8, 88, 9, 5, PAL.stoneGray)}
      ${rect(22, 84, 9, 5, PAL.stoneGray)}
      ${rect(48, 86, 9, 5, PAL.stoneGray)}
      ${rect(62, 82, 9, 5, PAL.stoneGray)}
      <!-- Saddle -->
      ${rect(25, 22, 30, 10, PAL.enemyRed)}
      ${rect(22, 20, 6, 8, PAL.enemyRed)}
      ${rect(52, 20, 6, 8, PAL.enemyRed)}
      <!-- Tail -->
      ${rect(-8, 30, 10, 20, PAL.deepSoil)}
      <!-- Rider -->
      ${rect(32, 2, 18, 20, PAL.playerBlue)}
      ${rect(35, -10, 12, 14, PAL.ember)}
      ${rect(38, -7, 4, 3, PAL.shadowBlack)}
      ${rect(35, -14, 12, 6, PAL.stoneGray)}
      <!-- Speed lines -->
      ${rect(-40, 40, 30, 3, PAL.shimmer, 0.4)}
      ${rect(-50, 50, 40, 3, PAL.shimmer, 0.3)}
      ${rect(-35, 60, 25, 3, PAL.shimmer, 0.25)}
      ${rect(-45, 70, 35, 3, PAL.shimmer, 0.2)}
      <!-- Dust particles -->
      ${rect(-20, 85, 12, 8, PAL.sand, 0.4)}
      ${rect(-35, 80, 10, 6, PAL.sand, 0.3)}
      ${rect(-10, 90, 8, 6, PAL.desertGold, 0.25)}
    </g>

    <!-- Sign post -->
    <g transform="translate(120, 340)">
      ${rect(8, 0, 6, 70, PAL.dirt)}
      ${rect(0, 5, 50, 16, PAL.dirt)}
      ${rect(2, 7, 46, 12, PAL.sand)}
      ${text(25, 16, 'TOWN', PAL.deepSoil, 9, 'middle')}
    </g>

    <!-- Mount ability indicator -->
    ${rect(350, 440, 260, 40, PAL.shadowBlack, 0.8)}
    ${rect(352, 442, 256, 36, PAL.deepOcean, 0.3)}
    ${text(360, 465, 'GALLOP  [SHIFT]', PAL.brightYellow, 14)}
    ${rect(530, 450, 70, 20, PAL.shadowBlack, 0.6)}
    ${rect(532, 452, 45, 16, PAL.leafGreen)}
    ${text(540, 464, 'STAMINA', PAL.nearWhite, 8)}

    ${hud()}
    ${goldBorder()}
    <!-- Feature label -->
    ${rect(W/2-80, H-50, 160, 30, PAL.shadowBlack, 0.85)}
    ${text(W/2, H-30, 'MOUNT RIDING', PAL.brightYellow, 16, 'middle', 'letter-spacing="3"')}
  </svg>`;
}

// Generate fishing mini-game screenshot
function screenshotFishing() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Sky - dusk -->
    ${rect(0, 0, W, 200, PAL.oceanBlue)}
    ${rect(0, 100, W, 100, PAL.skyBlue, 0.4)}
    ${rect(0, 170, W, 30, PAL.fireOrange, 0.2)}

    <!-- Water -->
    ${rect(0, 200, W, 340, PAL.oceanBlue)}
    ${rect(0, 200, W, 6, PAL.skyBlue)}
    <!-- Water surface reflections -->
    ${rect(50, 220, 40, 3, PAL.skyBlue, 0.3)}
    ${rect(200, 240, 50, 3, PAL.skyBlue, 0.25)}
    ${rect(400, 225, 60, 3, PAL.skyBlue, 0.3)}
    ${rect(600, 250, 45, 3, PAL.skyBlue, 0.2)}
    ${rect(750, 235, 55, 3, PAL.skyBlue, 0.25)}
    ${rect(100, 270, 30, 3, PAL.skyBlue, 0.15)}
    ${rect(500, 280, 40, 3, PAL.skyBlue, 0.2)}

    <!-- Shore/bank (left side) -->
    ${rect(0, 180, 300, 30, PAL.brightGrass)}
    ${rect(0, 180, 300, 4, PAL.lightFoliage)}
    ${rect(0, 200, 250, 15, PAL.dirt)}

    <!-- Dock -->
    ${rect(150, 190, 200, 15, PAL.dirt)}
    ${rect(150, 190, 200, 3, PAL.sand)}
    ${rect(160, 195, 8, 60, PAL.richEarth)}
    ${rect(260, 195, 8, 60, PAL.richEarth)}
    ${rect(340, 195, 8, 60, PAL.richEarth)}

    <!-- Player on dock -->
    <g transform="translate(230, 140)">
      ${rect(5, 15, 18, 24, PAL.playerBlue)}
      ${rect(8, 3, 12, 14, PAL.ember)}
      ${rect(11, 7, 4, 3, PAL.shadowBlack)}
      <!-- Hat -->
      ${rect(4, 0, 16, 5, PAL.dirt)}
      ${rect(6, -3, 12, 5, PAL.sand)}
      <!-- Legs dangling -->
      ${rect(7, 39, 7, 12, PAL.oceanBlue)}
      ${rect(16, 39, 7, 10, PAL.oceanBlue)}
    </g>

    <!-- Fishing rod -->
    <line x1="250" y1="145" x2="320" y2="120" stroke="${PAL.dirt}" stroke-width="3"/>
    <line x1="320" y1="120" x2="530" y2="300" stroke="${PAL.paleGray}" stroke-width="1.5"/>

    <!-- Bobber -->
    ${rect(525, 195, 10, 10, PAL.brightRed)}
    ${rect(526, 192, 8, 4, PAL.nearWhite)}

    <!-- === FISHING MINI-GAME UI === -->
    ${rect(580, 100, 200, 340, PAL.shadowBlack, 0.85)}
    ${rect(582, 102, 196, 336, PAL.deepOcean, 0.4)}

    <!-- Tension meter -->
    ${rect(600, 115, 20, 200, PAL.darkRock)}
    ${rect(602, 215, 16, 98, PAL.leafGreen)}
    ${rect(602, 180, 16, 35, PAL.brightYellow)}
    ${rect(602, 160, 16, 20, PAL.brightRed)}
    <!-- Tension indicator -->
    ${rect(595, 240, 30, 4, PAL.nearWhite)}
    ${text(610, 330, 'TENSION', PAL.lightStone, 8, 'middle')}

    <!-- Reel button -->
    ${rect(640, 140, 120, 30, PAL.deepSoil)}
    ${rect(642, 142, 116, 26, PAL.dirt)}
    ${text(700, 160, 'REEL [SPACE]', PAL.nearWhite, 10, 'middle')}

    <!-- Fish silhouette indicator -->
    ${rect(640, 190, 120, 80, PAL.deepOcean)}
    ${rect(642, 192, 116, 76, PAL.oceanBlue, 0.3)}
    ${text(700, 210, 'CATCH', PAL.lightStone, 9, 'middle')}
    <!-- Fish shadow -->
    <g transform="translate(665, 225)">
      ${rect(0, 5, 50, 20, PAL.skyBlue, 0.6)}
      ${rect(45, 8, 16, 14, PAL.skyBlue, 0.5)}
      ${rect(5, 10, 4, 4, PAL.shimmer)}
      ${text(25, 55, '???', PAL.lightStone, 12, 'middle')}
    </g>

    <!-- Bait indicator -->
    ${rect(640, 290, 120, 40, PAL.deepSoil, 0.6)}
    ${text(700, 305, 'BAIT: WORM', PAL.brightGrass, 9, 'middle')}
    ${text(700, 320, 'x12 remaining', PAL.lightStone, 8, 'middle')}

    <!-- Catch log -->
    ${rect(640, 340, 120, 80, PAL.shadowBlack, 0.5)}
    ${text(700, 358, 'CATCHES', PAL.gold, 9, 'middle')}
    ${text(650, 375, 'Forest Bass   x2', PAL.lightStone, 8)}
    ${text(650, 390, 'River Trout   x1', PAL.lightStone, 8)}
    ${text(650, 405, 'Old Boot      x1', PAL.midGray, 8)}

    <!-- Fish in water (visible) -->
    <g transform="translate(380, 300)">
      ${rect(0, 0, 24, 12, PAL.skyBlue, 0.5)}
      ${rect(20, 2, 10, 8, PAL.skyBlue, 0.4)}
      ${rect(3, 3, 3, 3, PAL.shimmer, 0.6)}
    </g>
    <g transform="translate(100, 350)">
      ${rect(0, 0, 18, 9, PAL.skyBlue, 0.3)}
      ${rect(15, 2, 8, 5, PAL.skyBlue, 0.25)}
    </g>

    <!-- Splash at bobber -->
    ${rect(520, 190, 4, 5, PAL.shimmer, 0.5)}
    ${rect(537, 188, 4, 5, PAL.shimmer, 0.4)}
    ${rect(528, 185, 3, 4, PAL.iceBlue, 0.6)}

    <!-- Trees on shore -->
    <polygon points="20,180 45,110 70,180" fill="${PAL.forestGreen}"/>
    <polygon points="80,180 105,100 130,180" fill="${PAL.deepForest}"/>
    ${rect(40, 180, 10, 25, PAL.richEarth)}
    ${rect(100, 180, 10, 25, PAL.richEarth)}

    ${hud()}
    ${goldBorder()}
    ${rect(W/2-100, H-50, 200, 30, PAL.shadowBlack, 0.85)}
    ${text(W/2, H-30, 'FISHING MINI-GAME', PAL.brightYellow, 16, 'middle', 'letter-spacing="2"')}
  </svg>`;
}

// Generate auction house screenshot
function screenshotAuctionHouse() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Interior background -->
    ${rect(0, 0, W, H, PAL.deepSoil)}
    <!-- Floor -->
    ${rect(0, 380, W, 160, PAL.dirt)}
    ${rect(0, 380, W, 4, PAL.sand)}
    <!-- Floor tiles pattern -->
    ${Array.from({length: 20}, (_, i) => rect(i * 48, 380, 2, 160, PAL.richEarth, 0.3)).join('')}
    ${Array.from({length: 4}, (_, i) => rect(0, 400 + i * 40, W, 2, PAL.richEarth, 0.2)).join('')}
    <!-- Walls -->
    ${rect(0, 0, W, 200, PAL.sand)}
    ${rect(0, 195, W, 8, PAL.dirt)}
    <!-- Wall decoration -->
    ${rect(0, 80, W, 4, PAL.darkGold)}
    ${rect(0, 180, W, 4, PAL.darkGold)}
    <!-- Banners -->
    ${rect(100, 30, 40, 60, PAL.enemyRed)}${rect(108, 35, 24, 15, PAL.gold)}
    ${rect(400, 30, 40, 60, PAL.oceanBlue)}${rect(408, 35, 24, 15, PAL.gold)}
    ${rect(700, 30, 40, 60, PAL.manaViolet)}${rect(708, 35, 24, 15, PAL.gold)}

    <!-- Auction counter -->
    ${rect(200, 280, 300, 80, PAL.richEarth)}
    ${rect(200, 280, 300, 8, PAL.dirt)}
    ${rect(200, 280, 4, 80, PAL.deepSoil)}
    ${rect(496, 280, 4, 80, PAL.deepSoil)}

    <!-- Auctioneer NPC -->
    <g transform="translate(320, 215)">
      ${rect(5, 12, 24, 18, PAL.darkGold)}
      ${rect(8, 0, 18, 14, PAL.ember)}
      ${rect(12, 4, 4, 3, PAL.shadowBlack)}
      ${rect(18, 4, 4, 3, PAL.shadowBlack)}
      ${rect(5, 30, 10, 8, PAL.richEarth)}
      ${rect(19, 30, 10, 8, PAL.richEarth)}
      <!-- Monocle -->
      ${rect(17, 3, 6, 6, PAL.gold)}
      ${rect(19, 5, 2, 2, PAL.shimmer)}
    </g>

    <!-- Player character -->
    <g transform="translate(150, 320)">
      ${rect(5, 12, 18, 18, PAL.playerBlue)}
      ${rect(8, 0, 12, 14, PAL.ember)}
      ${rect(11, 4, 4, 3, PAL.shadowBlack)}
      ${rect(5, 30, 8, 10, PAL.oceanBlue)}
      ${rect(15, 30, 8, 10, PAL.oceanBlue)}
    </g>

    <!-- === AUCTION HOUSE UI PANEL === -->
    ${rect(530, 30, 410, 480, PAL.shadowBlack, 0.9)}
    ${rect(532, 32, 406, 476, PAL.deepSoil, 0.8)}
    ${rect(532, 32, 406, 30, PAL.darkGold)}
    ${text(735, 52, 'AUCTION HOUSE', PAL.nearWhite, 14, 'middle', 'letter-spacing="2"')}

    <!-- Tab buttons -->
    ${rect(540, 70, 90, 24, PAL.darkGold)}
    ${text(585, 86, 'BROWSE', PAL.nearWhite, 10, 'middle')}
    ${rect(635, 70, 90, 24, PAL.richEarth)}
    ${text(680, 86, 'MY BIDS', PAL.lightStone, 10, 'middle')}
    ${rect(730, 70, 90, 24, PAL.richEarth)}
    ${text(775, 86, 'SELL', PAL.lightStone, 10, 'middle')}
    ${rect(825, 70, 90, 24, PAL.richEarth)}
    ${text(870, 86, 'HISTORY', PAL.lightStone, 10, 'middle')}

    <!-- Search bar -->
    ${rect(540, 100, 370, 24, PAL.darkRock)}
    ${text(548, 116, 'Search items...', PAL.midGray, 10)}
    ${rect(880, 100, 30, 24, PAL.darkGold)}
    ${text(895, 116, 'GO', PAL.nearWhite, 10, 'middle')}

    <!-- Category filter -->
    ${rect(540, 130, 80, 20, PAL.deepForest)}${text(580, 144, 'WEAPONS', PAL.lightFoliage, 8, 'middle')}
    ${rect(625, 130, 70, 20, PAL.richEarth)}${text(660, 144, 'ARMOR', PAL.lightStone, 8, 'middle')}
    ${rect(700, 130, 80, 20, PAL.richEarth)}${text(740, 144, 'POTIONS', PAL.lightStone, 8, 'middle')}
    ${rect(785, 130, 70, 20, PAL.richEarth)}${text(820, 144, 'MATS', PAL.lightStone, 8, 'middle')}
    ${rect(860, 130, 50, 20, PAL.richEarth)}${text(885, 144, 'ALL', PAL.lightStone, 8, 'middle')}

    <!-- Listing headers -->
    ${rect(540, 158, 370, 18, PAL.deepSoil)}
    ${text(548, 172, 'ITEM', PAL.gold, 9)}
    ${text(720, 172, 'PRICE', PAL.gold, 9)}
    ${text(800, 172, 'TIME', PAL.gold, 9)}
    ${text(880, 172, 'BIDS', PAL.gold, 9)}

    <!-- Listing rows -->
    ${rect(540, 180, 370, 36, PAL.darkRock, 0.4)}
    ${rect(545, 184, 28, 28, PAL.deepSoil)}${rect(547, 186, 24, 24, PAL.brightRed, 0.3)}
    ${text(580, 195, 'Iron Greatsword', PAL.nearWhite, 10)}
    ${text(580, 208, 'Lv.25  ATK +42', PAL.lightStone, 8)}
    ${text(720, 200, '850g', PAL.brightYellow, 10)}
    ${text(800, 200, '2h 14m', PAL.lightStone, 9)}
    ${text(890, 200, '3', PAL.playerBlue, 10, 'middle')}

    ${rect(540, 220, 370, 36, PAL.darkRock, 0.2)}
    ${rect(545, 224, 28, 28, PAL.deepSoil)}${rect(547, 226, 24, 24, PAL.skyBlue, 0.3)}
    ${text(580, 235, 'Enchanted Robe', PAL.shimmer, 10)}
    ${text(580, 248, 'Lv.30  DEF +28  INT +15', PAL.lightStone, 8)}
    ${text(720, 240, '2,400g', PAL.brightYellow, 10)}
    ${text(800, 240, '5h 02m', PAL.lightStone, 9)}
    ${text(890, 240, '7', PAL.playerBlue, 10, 'middle')}

    ${rect(540, 260, 370, 36, PAL.darkRock, 0.4)}
    ${rect(545, 264, 28, 28, PAL.deepSoil)}${rect(547, 266, 24, 24, PAL.brightYellow, 0.3)}
    ${text(580, 275, 'Phoenix Feather', PAL.brightYellow, 10)}
    ${text(580, 288, 'Legendary  Crafting Material', PAL.lightStone, 8)}
    ${text(720, 280, '12,000g', PAL.brightYellow, 10)}
    ${text(800, 280, '23h 41m', PAL.lightStone, 9)}
    ${text(890, 280, '15', PAL.brightRed, 10, 'middle')}

    ${rect(540, 300, 370, 36, PAL.darkRock, 0.2)}
    ${rect(545, 304, 28, 28, PAL.deepSoil)}${rect(547, 306, 24, 24, PAL.leafGreen, 0.3)}
    ${text(580, 315, 'Health Potion Bundle', PAL.nearWhite, 10)}
    ${text(580, 328, 'Restores 200 HP  x20', PAL.lightStone, 8)}
    ${text(720, 320, '300g', PAL.brightYellow, 10)}
    ${text(800, 320, '1h 05m', PAL.lightStone, 9)}
    ${text(890, 320, '1', PAL.playerBlue, 10, 'middle')}

    ${rect(540, 340, 370, 36, PAL.darkRock, 0.4)}
    ${rect(545, 344, 28, 28, PAL.deepSoil)}${rect(547, 346, 24, 24, PAL.manaViolet, 0.3)}
    ${text(580, 355, 'Arcane Focus Gem', PAL.spellGlow, 10)}
    ${text(580, 368, 'Epic  INT +25  Cast Speed +10%', PAL.lightStone, 8)}
    ${text(720, 360, '5,500g', PAL.brightYellow, 10)}
    ${text(800, 360, '8h 30m', PAL.lightStone, 9)}
    ${text(890, 360, '9', PAL.playerBlue, 10, 'middle')}

    <!-- Your gold -->
    ${rect(540, 390, 370, 28, PAL.deepSoil)}
    ${text(548, 408, 'YOUR GOLD:', PAL.lightStone, 10)}
    ${text(680, 408, '24,350', PAL.brightYellow, 12)}
    ${rect(548, 388, 8, 8, PAL.gold)}

    <!-- Bid button -->
    ${rect(750, 430, 120, 35, PAL.darkGold)}
    ${rect(752, 432, 116, 31, PAL.gold, 0.3)}
    ${text(810, 452, 'PLACE BID', PAL.nearWhite, 12, 'middle')}

    <!-- Buyout button -->
    ${rect(620, 430, 120, 35, PAL.deepForest)}
    ${rect(622, 432, 116, 31, PAL.forestGreen, 0.3)}
    ${text(680, 452, 'BUY NOW', PAL.nearWhite, 12, 'middle')}

    <!-- Page indicator -->
    ${text(735, 485, 'Page 1 of 24', PAL.lightStone, 9, 'middle')}

    ${hud()}
    ${goldBorder()}
    ${rect(W/2-200, H-50, 160, 30, PAL.shadowBlack, 0.85)}
    ${text(W/2-120, H-30, 'AUCTION HOUSE', PAL.brightYellow, 16, 'middle', 'letter-spacing="2"')}
  </svg>`;
}

// Generate dodge combat screenshot
function screenshotDodgeCombat() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Forest dungeon background -->
    ${rect(0, 0, W, H, PAL.deepForest)}
    ${rect(0, 0, W, 100, PAL.shadowBlack, 0.3)}

    <!-- Dark canopy -->
    ${Array.from({length: 15}, (_, i) => `<polygon points="${i*70-10},0 ${i*70+25},-30 ${i*70+60},0" fill="${PAL.shadowBlack}" opacity="0.4"/>`).join('')}

    <!-- Ground -->
    ${rect(0, 380, W, 160, PAL.deepForest)}
    ${rect(0, 380, W, 4, PAL.forestGreen)}
    ${rect(0, 420, W, 120, PAL.deepSoil)}

    <!-- Ground detail -->
    ${rect(50, 385, 20, 3, PAL.leafGreen, 0.4)}
    ${rect(200, 387, 15, 3, PAL.leafGreen, 0.3)}
    ${rect(600, 384, 25, 3, PAL.leafGreen, 0.4)}

    <!-- Trees -->
    <polygon points="0,380 40,200 80,380" fill="${PAL.forestGreen}" opacity="0.6"/>
    <polygon points="850,380 890,220 930,380" fill="${PAL.forestGreen}" opacity="0.6"/>
    ${rect(35, 300, 12, 80, PAL.richEarth, 0.5)}
    ${rect(885, 300, 12, 80, PAL.richEarth, 0.5)}

    <!-- === PLAYER DODGING (mid-roll) === -->
    <g transform="translate(300, 300) rotate(-30, 20, 30)">
      <!-- Body tilted in dodge -->
      ${rect(5, 12, 24, 20, PAL.playerBlue)}
      ${rect(3, 10, 6, 6, PAL.shimmer)}
      ${rect(8, 0, 14, 14, PAL.ember)}
      ${rect(11, 4, 4, 3, PAL.shadowBlack)}
      ${rect(5, 32, 10, 8, PAL.oceanBlue)}
      ${rect(19, 32, 10, 8, PAL.oceanBlue)}
    </g>
    <!-- Dodge flash VFX -->
    ${rect(290, 310, 16, 16, PAL.shimmer, 0.5)}
    ${rect(285, 320, 10, 10, PAL.nearWhite, 0.3)}
    ${rect(300, 300, 8, 8, PAL.iceBlue, 0.4)}
    <!-- Dodge dust trail -->
    ${rect(340, 370, 20, 10, PAL.sand, 0.4)}
    ${rect(355, 365, 15, 8, PAL.sand, 0.3)}
    ${rect(365, 372, 12, 6, PAL.desertGold, 0.2)}
    <!-- After-image ghost -->
    ${rect(360, 310, 24, 20, PAL.playerBlue, 0.15)}
    ${rect(363, 298, 14, 14, PAL.ember, 0.15)}

    <!-- === ENEMY ORC ATTACKING === -->
    <g transform="translate(500, 270)">
      <!-- Orc body -->
      ${rect(0, 16, 36, 30, PAL.forestGreen)}
      ${rect(4, 0, 28, 20, PAL.leafGreen)}
      ${rect(10, 6, 6, 5, PAL.brightRed)}
      ${rect(20, 6, 6, 5, PAL.brightRed)}
      ${rect(12, 14, 12, 4, PAL.shadowBlack)}
      <!-- Tusks -->
      ${rect(8, 16, 4, 6, PAL.paleGray)}
      ${rect(24, 16, 4, 6, PAL.paleGray)}
      <!-- Legs -->
      ${rect(4, 46, 12, 14, PAL.deepForest)}
      ${rect(20, 46, 12, 14, PAL.deepForest)}
      <!-- Weapon swing (big axe) -->
      ${rect(-50, 10, 55, 6, PAL.stoneGray)}
      ${rect(-55, 0, 16, 24, PAL.midGray)}
      ${rect(-57, 2, 4, 20, PAL.lightStone)}
    </g>

    <!-- Attack miss indicator -->
    ${text(350, 290, 'DODGE!', PAL.shimmer, 20, 'middle', 'font-weight="bold"')}

    <!-- Sword slash trail (missed) -->
    ${rect(430, 295, 40, 3, PAL.nearWhite, 0.5)}
    ${rect(440, 290, 30, 2, PAL.nearWhite, 0.3)}
    ${rect(450, 300, 20, 2, PAL.nearWhite, 0.2)}

    <!-- Second enemy -->
    <g transform="translate(680, 300)">
      ${rect(0, 12, 28, 24, PAL.enemyRed)}
      ${rect(4, 0, 20, 16, PAL.brightRed)}
      ${rect(8, 5, 5, 4, PAL.brightYellow)}
      ${rect(16, 5, 5, 4, PAL.brightYellow)}
      ${rect(4, 36, 8, 12, PAL.deepBlood)}
      ${rect(16, 36, 8, 12, PAL.deepBlood)}
    </g>

    <!-- Dodge cooldown UI -->
    ${rect(380, 440, 200, 40, PAL.shadowBlack, 0.85)}
    ${rect(382, 442, 196, 36, PAL.deepOcean, 0.3)}
    ${rect(390, 450, 80, 20, PAL.darkRock)}
    ${rect(392, 452, 50, 16, PAL.playerBlue)}
    ${text(392, 464, 'DODGE', PAL.nearWhite, 9)}
    <!-- Stamina pips -->
    ${rect(480, 452, 12, 16, PAL.leafGreen)}
    ${rect(496, 452, 12, 16, PAL.leafGreen)}
    ${rect(512, 452, 12, 16, PAL.darkRock)}
    ${text(540, 464, '2/3', PAL.lightStone, 10)}

    <!-- Combo counter -->
    ${rect(50, 200, 120, 40, PAL.shadowBlack, 0.7)}
    ${text(60, 225, 'COMBO', PAL.fireOrange, 10)}
    ${text(130, 230, 'x7', PAL.brightYellow, 18)}

    ${hud()}
    ${goldBorder()}
    ${rect(W/2-90, H-50, 180, 30, PAL.shadowBlack, 0.85)}
    ${text(W/2, H-30, 'DODGE COMBAT', PAL.brightYellow, 16, 'middle', 'letter-spacing="3"')}
  </svg>`;
}

// Generate world map screenshot
function screenshotWorldMap() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Map background (parchment) -->
    ${rect(0, 0, W, H, PAL.desertGold)}
    ${rect(0, 0, W, H, PAL.paleSand, 0.3)}

    <!-- Parchment texture (subtle lines) -->
    ${Array.from({length: 30}, (_, i) => rect(0, i * 18, W, 1, PAL.sand, 0.2)).join('')}

    <!-- Map border -->
    ${rect(20, 20, W - 40, H - 40, 'none')}
    ${rect(20, 20, W - 40, 3, PAL.richEarth)}
    ${rect(20, H - 23, W - 40, 3, PAL.richEarth)}
    ${rect(20, 20, 3, H - 40, PAL.richEarth)}
    ${rect(W - 23, 20, 3, H - 40, PAL.richEarth)}
    <!-- Corner decorations -->
    ${rect(18, 18, 10, 10, PAL.darkGold)}
    ${rect(W - 28, 18, 10, 10, PAL.darkGold)}
    ${rect(18, H - 28, 10, 10, PAL.darkGold)}
    ${rect(W - 28, H - 28, 10, 10, PAL.darkGold)}

    <!-- Title cartouche -->
    ${rect(340, 30, 280, 35, PAL.richEarth)}
    ${rect(342, 32, 276, 31, PAL.sand)}
    ${text(480, 53, 'REALM OF PIXELHEIM', PAL.deepSoil, 14, 'middle', 'letter-spacing="3"')}

    <!-- === ZONES === -->
    <!-- Forest zone (center) -->
    ${rect(200, 200, 180, 120, PAL.forestGreen, 0.5)}
    ${rect(200, 200, 180, 3, PAL.leafGreen, 0.6)}
    <!-- Mini trees -->
    ${Array.from({length: 12}, (_, i) => {
      const x = 210 + (i % 4) * 40;
      const y = 220 + Math.floor(i / 4) * 35;
      return `<polygon points="${x},${y+20} ${x+8},${y} ${x+16},${y+20}" fill="${PAL.leafGreen}" opacity="0.7"/>`;
    }).join('')}
    ${text(290, 340, 'VERDANT WOODS', PAL.deepForest, 10, 'middle')}
    ${text(290, 355, 'Tier 1-2', PAL.richEarth, 8, 'middle')}

    <!-- Desert zone (right) -->
    ${rect(500, 180, 160, 130, PAL.sand, 0.5)}
    ${Array.from({length: 4}, (_, i) => `<polygon points="${520+i*35},${310} ${535+i*35},${260+i*10} ${550+i*35},${310}" fill="${PAL.desertGold}" opacity="0.4"/>`).join('')}
    ${text(580, 330, 'SUNSCORCH DESERT', PAL.darkGold, 10, 'middle')}
    ${text(580, 345, 'Tier 2-3', PAL.richEarth, 8, 'middle')}

    <!-- Ice zone (top-right) -->
    ${rect(550, 80, 160, 90, PAL.iceBlue, 0.4)}
    ${rect(570, 90, 30, 20, PAL.shimmer, 0.3)}
    ${rect(620, 100, 25, 15, PAL.shimmer, 0.25)}
    ${text(630, 185, 'FROSTPEAK', PAL.oceanBlue, 10, 'middle')}
    ${text(630, 198, 'Tier 3', PAL.richEarth, 8, 'middle')}

    <!-- Ocean zone (bottom) -->
    ${rect(300, 380, 250, 100, PAL.skyBlue, 0.3)}
    ${rect(300, 380, 250, 3, PAL.oceanBlue, 0.4)}
    ${rect(320, 395, 20, 2, PAL.iceBlue, 0.3)}
    ${rect(400, 410, 25, 2, PAL.iceBlue, 0.25)}
    ${text(425, 450, 'CORAL SEA', PAL.oceanBlue, 10, 'middle')}

    <!-- Volcanic zone (far right) -->
    ${rect(700, 250, 120, 100, PAL.deepBlood, 0.3)}
    <polygon points="730,340 760,260 790,340" fill="${PAL.enemyRed}" opacity="0.4"/>
    ${rect(755, 255, 10, 8, PAL.fireOrange, 0.5)}
    ${text(760, 365, 'ASHLANDS', PAL.brightRed, 10, 'middle')}
    ${text(760, 378, 'Tier 3', PAL.richEarth, 8, 'middle')}

    <!-- Town (left of forest) -->
    ${rect(60, 250, 100, 80, PAL.brightGrass, 0.4)}
    ${rect(80, 270, 20, 15, PAL.dirt)}${rect(80, 265, 20, 6, PAL.enemyRed)}
    ${rect(110, 275, 15, 12, PAL.dirt)}${rect(110, 270, 15, 6, PAL.enemyRed)}
    ${text(110, 345, 'HAVEN TOWN', PAL.deepSoil, 10, 'middle')}
    ${text(110, 358, 'Hub', PAL.richEarth, 8, 'middle')}

    <!-- Swamp (bottom-left) -->
    ${rect(50, 380, 130, 80, PAL.deepForest, 0.3)}
    ${text(115, 440, 'MURK SWAMP', PAL.deepForest, 10, 'middle')}
    ${text(115, 453, 'Tier 2', PAL.richEarth, 8, 'middle')}

    <!-- === WAYSTONES (fast travel points) === -->
    <!-- Waystone icons (glowing blue markers) -->
    <g>
      <!-- Haven Town waystone -->
      ${rect(95, 280, 8, 12, PAL.playerBlue)}
      ${rect(93, 277, 12, 5, PAL.shimmer)}
      ${rect(96, 273, 6, 5, PAL.shimmer, 0.5)}

      <!-- Forest waystone -->
      ${rect(270, 260, 8, 12, PAL.playerBlue)}
      ${rect(268, 257, 12, 5, PAL.shimmer)}
      ${rect(271, 253, 6, 5, PAL.shimmer, 0.5)}

      <!-- Desert waystone -->
      ${rect(560, 250, 8, 12, PAL.playerBlue)}
      ${rect(558, 247, 12, 5, PAL.shimmer)}

      <!-- Ice waystone -->
      ${rect(610, 120, 8, 12, PAL.playerBlue)}
      ${rect(608, 117, 12, 5, PAL.shimmer)}
    </g>

    <!-- Player position marker -->
    ${rect(265, 240, 16, 16, PAL.brightYellow)}
    ${rect(268, 243, 10, 10, PAL.gold)}
    ${rect(271, 246, 4, 4, PAL.nearWhite)}
    ${text(273, 235, 'YOU', PAL.brightYellow, 8, 'middle')}

    <!-- Quest markers -->
    ${rect(120, 260, 8, 8, PAL.brightYellow)}
    ${text(124, 258, '!', PAL.shadowBlack, 8, 'middle')}
    ${rect(580, 220, 8, 8, PAL.brightYellow)}
    ${text(584, 218, '!', PAL.shadowBlack, 8, 'middle')}

    <!-- === FAST TRAVEL UI POPUP === -->
    ${rect(600, 370, 300, 140, PAL.shadowBlack, 0.9)}
    ${rect(602, 372, 296, 136, PAL.deepOcean, 0.5)}
    ${rect(602, 372, 296, 28, PAL.oceanBlue, 0.4)}
    ${text(750, 392, 'FAST TRAVEL', PAL.shimmer, 12, 'middle', 'letter-spacing="2"')}

    ${rect(612, 408, 276, 24, PAL.darkRock, 0.5)}
    ${rect(616, 412, 12, 16, PAL.playerBlue)}
    ${text(636, 424, 'Haven Town', PAL.nearWhite, 10)}
    ${text(860, 424, 'FREE', PAL.leafGreen, 10)}

    ${rect(612, 436, 276, 24, PAL.darkRock, 0.3)}
    ${rect(616, 440, 12, 16, PAL.playerBlue)}
    ${text(636, 452, 'Sunscorch Oasis', PAL.nearWhite, 10)}
    ${text(860, 452, '50g', PAL.brightYellow, 10)}

    ${rect(612, 464, 276, 24, PAL.darkRock, 0.5)}
    ${rect(616, 468, 12, 16, PAL.midGray)}
    ${text(636, 480, 'Frostpeak Summit', PAL.midGray, 10)}
    ${text(835, 480, 'LOCKED', PAL.enemyRed, 10)}

    <!-- Compass rose -->
    <g transform="translate(830, 80)">
      ${text(0, -15, 'N', PAL.deepSoil, 10, 'middle')}
      ${text(0, 35, 'S', PAL.deepSoil, 10, 'middle')}
      ${text(-25, 10, 'W', PAL.deepSoil, 10, 'middle')}
      ${text(25, 10, 'E', PAL.deepSoil, 10, 'middle')}
      ${rect(-2, -5, 4, 20, PAL.enemyRed)}
      ${rect(-8, 5, 16, 4, PAL.richEarth)}
      ${rect(-3, -3, 6, 6, PAL.gold)}
    </g>

    <!-- Legend -->
    ${rect(30, 440, 150, 55, PAL.sand, 0.8)}
    ${rect(30, 440, 150, 2, PAL.richEarth)}
    ${rect(40, 452, 8, 8, PAL.playerBlue)}${text(55, 460, 'Waystone', PAL.deepSoil, 8)}
    ${rect(40, 466, 8, 8, PAL.brightYellow)}${text(55, 474, 'Quest', PAL.deepSoil, 8)}
    ${rect(40, 480, 8, 8, PAL.gold)}${text(55, 488, 'Player', PAL.deepSoil, 8)}
    ${rect(110, 452, 8, 8, PAL.enemyRed)}${text(125, 460, 'Danger', PAL.deepSoil, 8)}

    ${goldBorder()}
    ${rect(W/2-100, H-50, 200, 30, PAL.shadowBlack, 0.85)}
    ${text(W/2, H-30, 'WORLD MAP &amp; WAYSTONES', PAL.brightYellow, 14, 'middle', 'letter-spacing="2"')}
  </svg>`;
}

// Generate bestiary collection screenshot
function screenshotBestiary() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Dark background (book/tome feel) -->
    ${rect(0, 0, W, H, PAL.deepSoil)}

    <!-- Book spread background -->
    ${rect(40, 30, W - 80, H - 60, PAL.desertGold)}
    ${rect(42, 32, W - 84, H - 64, PAL.paleSand)}
    <!-- Book spine -->
    ${rect(W / 2 - 4, 30, 8, H - 60, PAL.richEarth)}
    ${rect(W / 2 - 2, 32, 4, H - 64, PAL.dirt)}

    <!-- Left page header -->
    ${text(260, 65, 'BESTIARY', PAL.deepSoil, 18, 'middle', 'letter-spacing="4"')}
    ${rect(100, 75, 320, 2, PAL.richEarth)}

    <!-- Creature entry - Green Slime -->
    ${rect(60, 90, 100, 100, PAL.deepSoil, 0.1)}
    ${rect(62, 92, 96, 96, PAL.nearWhite, 0.1)}
    <!-- Slime sprite -->
    <g transform="translate(85, 105)">
      ${rect(5, 20, 40, 30, PAL.leafGreen)}
      ${rect(10, 15, 30, 10, PAL.leafGreen)}
      ${rect(15, 12, 20, 5, PAL.brightGrass)}
      ${rect(15, 25, 6, 5, PAL.shadowBlack)}
      ${rect(30, 25, 6, 5, PAL.shadowBlack)}
      ${rect(20, 35, 10, 4, PAL.deepForest)}
      ${rect(35, 15, 6, 4, PAL.shimmer, 0.5)}
    </g>
    ${text(110, 200, 'Green Slime', PAL.deepSoil, 10, 'middle')}
    ${text(110, 214, 'Common', PAL.leafGreen, 8, 'middle')}

    <!-- Stats -->
    ${rect(170, 90, 280, 100, PAL.nearWhite, 0.05)}
    ${text(180, 108, 'GREEN SLIME', PAL.deepSoil, 12)}
    ${text(180, 124, 'HP: 45  ATK: 8  DEF: 3', PAL.richEarth, 9)}
    ${text(180, 140, 'Zone: Verdant Woods (Tier 1)', PAL.richEarth, 9)}
    ${text(180, 156, 'Drops: Slime Gel (60%), Green Dye (5%)', PAL.richEarth, 9)}
    ${text(180, 172, 'Weakness: Fire  |  Resist: Water', PAL.richEarth, 9)}
    <!-- Discovery badge -->
    ${rect(400, 95, 40, 16, PAL.forestGreen)}
    ${text(420, 107, 'FOUND', PAL.nearWhite, 8, 'middle')}
    ${text(180, 188, 'Defeated: 47 / 50 (Gold Badge)', PAL.darkGold, 9)}

    <!-- Creature entry - Fire Imp -->
    ${rect(60, 200, 100, 100, PAL.deepSoil, 0.1)}
    <g transform="translate(80, 210)">
      ${rect(10, 10, 30, 25, PAL.brightRed)}
      ${rect(15, 5, 20, 10, PAL.fireOrange)}
      ${rect(5, 0, 8, 8, PAL.brightYellow)}
      ${rect(37, 0, 8, 8, PAL.brightYellow)}
      ${rect(18, 12, 5, 4, PAL.brightYellow)}
      ${rect(27, 12, 5, 4, PAL.brightYellow)}
      ${rect(15, 35, 8, 12, PAL.enemyRed)}
      ${rect(27, 35, 8, 12, PAL.enemyRed)}
    </g>
    ${text(110, 310, 'Fire Imp', PAL.deepSoil, 10, 'middle')}
    ${text(110, 324, 'Uncommon', PAL.fireOrange, 8, 'middle')}

    ${rect(170, 200, 280, 100, PAL.nearWhite, 0.05)}
    ${text(180, 218, 'FIRE IMP', PAL.deepSoil, 12)}
    ${text(180, 234, 'HP: 120  ATK: 22  DEF: 8', PAL.richEarth, 9)}
    ${text(180, 250, 'Zone: Ashlands (Tier 2-3)', PAL.richEarth, 9)}
    ${text(180, 266, 'Drops: Ember Shard (40%), Fire Orb (2%)', PAL.richEarth, 9)}
    ${text(180, 282, 'Weakness: Ice  |  Resist: Fire', PAL.richEarth, 9)}
    ${rect(400, 205, 40, 16, PAL.forestGreen)}
    ${text(420, 217, 'FOUND', PAL.nearWhite, 8, 'middle')}
    ${text(180, 298, 'Defeated: 23 / 50 (Silver Badge)', PAL.lightStone, 9)}

    <!-- Undiscovered creature -->
    ${rect(60, 310, 100, 100, PAL.deepSoil, 0.1)}
    ${rect(80, 330, 60, 60, PAL.midGray, 0.3)}
    ${text(110, 370, '?', PAL.midGray, 30, 'middle')}
    ${text(110, 420, '???', PAL.midGray, 10, 'middle')}
    ${text(110, 434, 'Undiscovered', PAL.midGray, 8, 'middle')}
    ${rect(170, 310, 280, 100, PAL.nearWhite, 0.05)}
    ${text(310, 370, 'Explore the Ashlands to discover', PAL.midGray, 10, 'middle')}
    ${text(310, 388, 'this creature...', PAL.midGray, 10, 'middle')}

    <!-- RIGHT PAGE: Collection grid -->
    ${text(720, 65, 'COLLECTION', PAL.deepSoil, 18, 'middle', 'letter-spacing="4"')}
    ${rect(560, 75, 320, 2, PAL.richEarth)}

    <!-- Creature grid (discovered/undiscovered) -->
    ${[
      {x:0, y:0, c: PAL.leafGreen, n: 'Slime'},
      {x:1, y:0, c: PAL.skyBlue, n: 'Bat'},
      {x:2, y:0, c: PAL.brightRed, n: 'Imp'},
      {x:3, y:0, c: PAL.forestGreen, n: 'Toad'},
      {x:0, y:1, c: PAL.stoneGray, n: 'Golem'},
      {x:1, y:1, c: PAL.sand, n: 'Scorpion'},
      {x:2, y:1, c: PAL.iceBlue, n: 'Yeti'},
      {x:3, y:1, c: null},
      {x:0, y:2, c: PAL.manaViolet, n: 'Wraith'},
      {x:1, y:2, c: null},
      {x:2, y:2, c: null},
      {x:3, y:2, c: null},
      {x:0, y:3, c: PAL.fireOrange, n: 'Dragon'},
      {x:1, y:3, c: null},
      {x:2, y:3, c: null},
      {x:3, y:3, c: null},
    ].map(({x, y, c, n}) => {
      const bx = 560 + x * 80;
      const by = 90 + y * 80;
      const border = c ? PAL.richEarth : PAL.stoneGray;
      const fill = c || PAL.midGray;
      let s = rect(bx, by, 70, 70, border, 0.3) + rect(bx + 2, by + 2, 66, 66, PAL.paleSand, 0.3);
      if (c) {
        s += rect(bx + 15, by + 10, 40, 35, fill, 0.6);
        s += text(bx + 35, by + 62, n, PAL.deepSoil, 8, 'middle');
      } else {
        s += text(bx + 35, by + 40, '?', PAL.midGray, 20, 'middle');
      }
      return s;
    }).join('')}

    <!-- Collection progress -->
    ${rect(560, 420, 320, 50, PAL.deepSoil, 0.15)}
    ${text(720, 440, 'COLLECTION PROGRESS', PAL.deepSoil, 10, 'middle')}
    ${rect(580, 448, 260, 14, PAL.darkRock)}
    ${rect(582, 450, 130, 10, PAL.leafGreen)}
    ${text(720, 475, '52 / 96 Creatures Found  (54%)', PAL.richEarth, 9, 'middle')}

    <!-- Page number -->
    ${text(260, 480, '- 3 -', PAL.midGray, 10, 'middle')}
    ${text(720, 480, '- 4 -', PAL.midGray, 10, 'middle')}

    ${goldBorder()}
    ${rect(W/2-110, H-50, 220, 30, PAL.shadowBlack, 0.85)}
    ${text(W/2, H-30, 'BESTIARY COLLECTION', PAL.brightYellow, 14, 'middle', 'letter-spacing="2"')}
  </svg>`;
}

// Generate updated promo banner (960x540)
function bannerPromoV130() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="image-rendering: pixelated;">
    <!-- Night sky -->
    ${rect(0, 0, W, H, PAL.deepOcean)}
    ${stars(25)}
    <!-- Twinkling stars -->
    <g fill="${PAL.paleHighlight}" filter="url(#glow)">
      ${rect(100, 50, 4, 4)}
      ${rect(300, 30, 4, 4)}
      ${rect(600, 60, 4, 4)}
      ${rect(850, 40, 4, 4)}
    </g>

    <defs>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>

    <!-- Moon -->
    ${rect(780, 40, 50, 50, PAL.paleHighlight, 0.2)}
    ${rect(785, 45, 40, 40, PAL.paleHighlight, 0.15)}

    <!-- Mountains -->
    <polygon points="0,350 120,200 240,350" fill="${PAL.deepForest}" opacity="0.5"/>
    <polygon points="180,350 340,180 500,350" fill="${PAL.deepForest}" opacity="0.4"/>
    <polygon points="420,350 580,210 740,350" fill="${PAL.deepForest}" opacity="0.45"/>
    <polygon points="660,350 800,230 960,350" fill="${PAL.deepForest}" opacity="0.4"/>

    <!-- Forest trees mid-ground -->
    ${Array.from({length: 20}, (_, i) => `<polygon points="${i*50-10},350 ${i*50+15},280 ${i*50+40},350" fill="${PAL.forestGreen}" opacity="0.6"/>`).join('')}

    <!-- Ground -->
    ${rect(0, 350, W, 190, PAL.forestGreen)}
    ${rect(0, 350, W, 5, PAL.brightGrass)}
    ${rect(0, 380, W, 160, PAL.deepForest)}
    ${rect(0, 400, W, 140, PAL.deepSoil)}

    <!-- Path -->
    ${rect(0, 370, W, 20, PAL.dirt, 0.6)}
    ${rect(0, 370, W, 2, PAL.sand, 0.4)}

    <!-- === TITLE === -->
    <g transform="translate(150, 40) scale(1.5)">
      <!-- P -->
      <g fill="${PAL.playerBlue}">
        ${rect(0, 0, 7, 42)}${rect(7, 0, 14, 7)}${rect(21, 7, 7, 14)}${rect(7, 21, 14, 7)}
      </g>
      <!-- I -->
      <g fill="${PAL.playerBlue}">
        ${rect(36, 0, 21, 7)}${rect(43, 7, 7, 28)}${rect(36, 35, 21, 7)}
      </g>
      <!-- X -->
      <g fill="${PAL.playerBlue}">
        ${rect(64, 0, 7, 7)}${rect(84, 0, 7, 7)}${rect(71, 7, 7, 7)}${rect(77, 7, 7, 7)}
        ${rect(74, 14, 7, 14)}${rect(67, 28, 7, 7)}${rect(81, 28, 7, 7)}
        ${rect(64, 35, 7, 7)}${rect(84, 35, 7, 7)}
      </g>
      <!-- E -->
      <g fill="${PAL.playerBlue}">
        ${rect(99, 0, 7, 42)}${rect(106, 0, 21, 7)}${rect(106, 17, 14, 7)}${rect(106, 35, 21, 7)}
      </g>
      <!-- L -->
      <g fill="${PAL.playerBlue}">
        ${rect(134, 0, 7, 42)}${rect(141, 35, 21, 7)}
      </g>
      <!-- R (gold) -->
      <g fill="${PAL.brightYellow}">
        ${rect(178, 0, 7, 42)}${rect(185, 0, 14, 7)}${rect(199, 7, 7, 14)}${rect(185, 21, 14, 7)}
        ${rect(192, 28, 7, 7)}${rect(199, 35, 7, 7)}
      </g>
      <!-- E (gold) -->
      <g fill="${PAL.brightYellow}">
        ${rect(214, 0, 7, 42)}${rect(221, 0, 21, 7)}${rect(221, 17, 14, 7)}${rect(221, 35, 21, 7)}
      </g>
      <!-- A (gold) -->
      <g fill="${PAL.brightYellow}">
        ${rect(253, 7, 7, 35)}${rect(273, 7, 7, 35)}${rect(260, 0, 13, 7)}${rect(260, 21, 13, 7)}
      </g>
      <!-- L (gold) -->
      <g fill="${PAL.brightYellow}">
        ${rect(288, 0, 7, 42)}${rect(295, 35, 21, 7)}
      </g>
      <!-- M (gold) -->
      <g fill="${PAL.brightYellow}">
        ${rect(323, 0, 7, 42)}${rect(358, 0, 7, 42)}${rect(330, 7, 7, 7)}${rect(351, 7, 7, 7)}
        ${rect(337, 14, 14, 7)}
      </g>
    </g>

    <!-- Subtitle -->
    ${text(480, 120, 'PIXELATED MMORPG ADVENTURE', PAL.lightStone, 14, 'middle', 'letter-spacing="4"')}

    <!-- Version badge -->
    ${rect(380, 130, 200, 26, PAL.deepForest, 0.8)}
    ${rect(380, 130, 200, 2, PAL.leafGreen)}
    ${text(480, 149, 'v1.3.0  MEGA UPDATE', PAL.brightGrass, 12, 'middle', 'letter-spacing="2"')}

    <!-- === FEATURE SHOWCASE STRIP === -->
    <!-- Feature cards along the bottom -->
    ${[
      { x: 30, label: 'HOUSING', icon: 'house' },
      { x: 155, label: 'MOUNTS', icon: 'mount' },
      { x: 280, label: 'FISHING', icon: 'fish' },
      { x: 405, label: 'AUCTION', icon: 'trade' },
      { x: 530, label: 'DODGE', icon: 'combat' },
      { x: 655, label: 'BESTIARY', icon: 'book' },
      { x: 780, label: 'MAP', icon: 'map' },
    ].map(({x, label}) => {
      return `
        ${rect(x, 175, 110, 130, PAL.shadowBlack, 0.75)}
        ${rect(x + 2, 177, 106, 126, PAL.deepOcean, 0.3)}
        ${rect(x + 2, 177, 106, 3, PAL.gold, 0.5)}
        ${text(x + 55, 290, label, PAL.brightYellow, 10, 'middle', 'letter-spacing="1"')}
      `;
    }).join('')}

    <!-- Housing icon -->
    <g transform="translate(55, 195)">
      <polygon points="0,30 30,5 60,30" fill="${PAL.enemyRed}"/>
      ${rect(8, 30, 44, 30, PAL.dirt)}
      ${rect(22, 40, 16, 20, PAL.deepSoil)}
      ${rect(12, 38, 10, 10, PAL.iceBlue)}
      ${rect(38, 38, 10, 10, PAL.iceBlue)}
    </g>

    <!-- Mount icon -->
    <g transform="translate(175, 200)">
      ${rect(5, 15, 50, 25, PAL.richEarth)}
      ${rect(45, 5, 18, 18, PAL.richEarth)}
      ${rect(55, 8, 4, 4, PAL.shadowBlack)}
      ${rect(10, 40, 6, 15, PAL.deepSoil)}
      ${rect(25, 40, 6, 15, PAL.deepSoil)}
      ${rect(40, 40, 6, 15, PAL.deepSoil)}
      ${rect(20, 10, 20, 6, PAL.enemyRed)}
    </g>

    <!-- Fishing icon -->
    <g transform="translate(300, 195)">
      ${rect(25, 0, 3, 40, PAL.dirt)}
      <line x1="28" y1="0" x2="55" y2="30" stroke="${PAL.paleGray}" stroke-width="1.5"/>
      ${rect(52, 28, 8, 8, PAL.brightRed)}
      ${rect(10, 40, 40, 25, PAL.oceanBlue)}
      ${rect(20, 45, 20, 10, PAL.skyBlue, 0.5)}
    </g>

    <!-- Auction icon -->
    <g transform="translate(425, 195)">
      ${rect(5, 10, 50, 40, PAL.sand)}
      ${rect(10, 15, 12, 12, PAL.gold)}
      ${rect(30, 15, 20, 5, PAL.midGray)}
      ${rect(30, 23, 15, 5, PAL.midGray)}
      ${rect(10, 35, 40, 8, PAL.richEarth)}
      ${rect(0, 0, 60, 12, PAL.darkGold)}
      ${text(30, 10, 'SALE', PAL.nearWhite, 8, 'middle')}
    </g>

    <!-- Dodge icon -->
    <g transform="translate(555, 200)">
      ${rect(5, 10, 18, 18, PAL.playerBlue, 0.4)}
      ${rect(30, 10, 18, 18, PAL.playerBlue)}
      ${rect(55, 10, 22, 22, PAL.brightRed)}
      ${rect(60, 15, 4, 4, PAL.brightYellow)}
      ${rect(68, 15, 4, 4, PAL.brightYellow)}
      ${rect(20, 15, 12, 2, PAL.shimmer, 0.6)}
      ${rect(15, 20, 18, 2, PAL.shimmer, 0.4)}
      ${text(45, 50, 'MISS!', PAL.shimmer, 10, 'middle')}
    </g>

    <!-- Bestiary icon -->
    <g transform="translate(675, 195)">
      ${rect(5, 5, 50, 55, PAL.deepSoil)}
      ${rect(8, 8, 44, 49, PAL.desertGold)}
      ${rect(12, 15, 36, 20, PAL.richEarth, 0.3)}
      ${rect(20, 20, 20, 10, PAL.leafGreen, 0.5)}
      ${text(30, 55, 'x52', PAL.deepSoil, 10, 'middle')}
    </g>

    <!-- Map icon -->
    <g transform="translate(800, 195)">
      ${rect(0, 5, 60, 45, PAL.desertGold)}
      ${rect(2, 7, 56, 41, PAL.paleSand)}
      ${rect(10, 15, 15, 10, PAL.forestGreen, 0.5)}
      ${rect(35, 20, 12, 12, PAL.oceanBlue, 0.4)}
      ${rect(20, 35, 8, 8, PAL.brightRed, 0.4)}
      ${rect(30, 12, 4, 6, PAL.playerBlue)}
    </g>

    <!-- === CHARACTERS walking along path === -->
    <!-- Warrior -->
    <g transform="translate(150, 335)">
      ${rect(3, 10, 12, 14, PAL.playerBlue)}${rect(5, 0, 8, 10, PAL.ember)}
      ${rect(7, 3, 3, 2, PAL.shadowBlack)}${rect(3, 24, 5, 6, PAL.oceanBlue)}${rect(10, 24, 5, 6, PAL.oceanBlue)}
      ${rect(15, 8, 3, 12, PAL.lightStone)}
    </g>
    <!-- Mage -->
    <g transform="translate(350, 335)">
      ${rect(3, 10, 12, 14, PAL.manaViolet)}${rect(5, 0, 8, 10, PAL.ember)}
      ${rect(7, 3, 3, 2, PAL.shadowBlack)}${rect(3, 24, 5, 6, PAL.magicPurple)}${rect(10, 24, 5, 6, PAL.magicPurple)}
      ${rect(-3, 5, 3, 18, PAL.dirt)}${rect(-4, 2, 5, 5, PAL.manaViolet)}
    </g>
    <!-- Ranger -->
    <g transform="translate(550, 335)">
      ${rect(3, 10, 12, 14, PAL.forestGreen)}${rect(5, 0, 8, 10, PAL.ember)}
      ${rect(7, 3, 3, 2, PAL.shadowBlack)}${rect(3, 24, 5, 6, PAL.deepForest)}${rect(10, 24, 5, 6, PAL.deepForest)}
      ${rect(15, 5, 2, 16, PAL.dirt)}
    </g>
    <!-- Artisan -->
    <g transform="translate(750, 335)">
      ${rect(3, 10, 12, 14, PAL.gold)}${rect(5, 0, 8, 10, PAL.ember)}
      ${rect(7, 3, 3, 2, PAL.shadowBlack)}${rect(3, 24, 5, 6, PAL.darkGold)}${rect(10, 24, 5, 6, PAL.darkGold)}
      ${rect(15, 12, 8, 6, PAL.stoneGray)}
    </g>

    <!-- Town buildings in background -->
    <g transform="translate(60, 310)">
      ${rect(0, 15, 30, 25, PAL.dirt, 0.5)}
      <polygon points="0,15 15,0 30,15" fill="${PAL.enemyRed}" opacity="0.5"/>
      ${rect(10, 25, 10, 15, PAL.deepSoil, 0.5)}
      ${rect(12, 20, 6, 6, PAL.paleHighlight, 0.3)}
    </g>
    <g transform="translate(850, 310)">
      ${rect(0, 15, 35, 25, PAL.dirt, 0.5)}
      <polygon points="0,15 17,0 35,15" fill="${PAL.oceanBlue}" opacity="0.4"/>
      ${rect(12, 20, 10, 20, PAL.deepSoil, 0.5)}
    </g>

    <!-- Bottom feature list -->
    ${rect(0, 430, W, 110, PAL.shadowBlack, 0.85)}
    ${rect(0, 430, W, 2, PAL.gold)}
    ${text(480, 460, 'NEW IN v1.3.0', PAL.gold, 16, 'middle', 'letter-spacing="4"')}
    ${text(480, 485, 'Housing  ·  Mounts  ·  Fishing  ·  Auction House  ·  Dodge Combat', PAL.nearWhite, 12, 'middle', 'letter-spacing="1"')}
    ${text(480, 505, 'Bestiary  ·  World Map  ·  Cosmetic Shop  ·  Waystone Navigation', PAL.lightStone, 11, 'middle', 'letter-spacing="1"')}
    ${text(480, 525, 'pixelrealm.itch.io', PAL.playerBlue, 10, 'middle', 'letter-spacing="2"')}

    ${goldBorder()}
  </svg>`;
}

async function generateAll() {
  const outputDir = path.join(__dirname, '..', 'assets');
  const screenshots = [
    { name: 'marketing/screenshot_mount_riding.png', fn: screenshotMountRiding },
    { name: 'marketing/screenshot_fishing_minigame.png', fn: screenshotFishing },
    { name: 'marketing/screenshot_auction_house_ui.png', fn: screenshotAuctionHouse },
    { name: 'marketing/screenshot_dodge_combat.png', fn: screenshotDodgeCombat },
    { name: 'marketing/screenshot_world_map_navigation.png', fn: screenshotWorldMap },
    { name: 'marketing/screenshot_bestiary_collection.png', fn: screenshotBestiary },
    { name: 'promo/banner_promo_v130_960x540.png', fn: bannerPromoV130 },
  ];

  for (const { name, fn } of screenshots) {
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

generateAll().then(() => console.log('\nAll feature screenshots generated.'));
