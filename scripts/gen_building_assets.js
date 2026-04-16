#!/usr/bin/env node
// PIX-173 — Land parcel building sprites + placement UI icons (M14e)
// Output:
//   public/assets/nft/buildings/   — 32x32 building sprites (2x render res over 16x16 footprint)
//   public/assets/nft/             — 32x32 UI icons for placement panel
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Master palette (matches docs/ART-STYLE-GUIDE.md and scripts/generate_nft_assets.js)
const P = {
  black:[0x0d,0x0d,0x0d],darkRock:[0x2b,0x2b,0x2b],stoneGray:[0x4a,0x4a,0x4a],midGray:[0x6e,0x6e,0x6e],
  lightStone:[0x96,0x96,0x96],paleGray:[0xc8,0xc8,0xc8],nearWhite:[0xf0,0xf0,0xf0],
  deepSoil:[0x3b,0x20,0x10],richEarth:[0x6b,0x3a,0x1f],dirt:[0x8b,0x5c,0x2a],sand:[0xb8,0x84,0x3f],
  desertGold:[0xd4,0xa8,0x5a],paleSand:[0xe8,0xd0,0x8a],
  deepForest:[0x1a,0x3a,0x1a],forestGreen:[0x2d,0x6e,0x2d],leafGreen:[0x4c,0x9b,0x4c],
  brightGrass:[0x78,0xc8,0x78],lightFoliage:[0xa8,0xe4,0xa0],
  deepOcean:[0x0a,0x1a,0x3a],oceanBlue:[0x1a,0x4a,0x8a],skyBlue:[0x2a,0x7a,0xc0],
  playerBlue:[0x50,0xa8,0xe8],paleWater:[0x90,0xd0,0xf8],highlight:[0xc8,0xf0,0xff],
  deepBlood:[0x5a,0x0a,0x0a],enemyRed:[0xa0,0x10,0x10],brightRed:[0xd4,0x20,0x20],
  fireOrange:[0xf0,0x60,0x20],ember:[0xf8,0xa0,0x60],
  darkGold:[0xa8,0x70,0x00],gold:[0xe8,0xb8,0x00],brightYellow:[0xff,0xe0,0x40],
  paleHighlight:[0xff,0xf8,0xa0],
  deepMagic:[0x1a,0x0a,0x3a],magicPurple:[0x5a,0x20,0xa0],manaViolet:[0x90,0x50,0xe0],
  spellGlow:[0xd0,0x90,0xff],
};
const T = null; // transparent

// PNG writer (RGBA8)
function writePNG(w, h, pixels) {
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    const offset = y * (1 + w * 4);
    raw[offset] = 0;
    for (let x = 0; x < w; x++) {
      const c = pixels[y][x]; const i = offset + 1 + x * 4;
      if (c === null) { raw[i]=0;raw[i+1]=0;raw[i+2]=0;raw[i+3]=0; }
      else if (Array.isArray(c) && c.length === 4) { raw[i]=c[0];raw[i+1]=c[1];raw[i+2]=c[2];raw[i+3]=c[3]; }
      else { raw[i]=c[0];raw[i+1]=c[1];raw[i+2]=c[2];raw[i+3]=255; }
    }
  }
  const compressed = zlib.deflateSync(raw);
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c&1)?(0xedb88320^(c>>>1)):(c>>>1); crcTable[n]=c; }
  function crc32(buf) { let c=0xffffffff; for (let i=0;i<buf.length;i++) c=crcTable[(c^buf[i])&0xff]^(c>>>8); return (c^0xffffffff)>>>0; }
  function chunk(type, data) {
    const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
    const td=Buffer.concat([Buffer.from(type,'ascii'),data]);
    const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len,td,crc]);
  }
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);
  ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND',Buffer.alloc(0))]);
}
function save(w,h,pixels,filePath) {
  const dir=path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(filePath,writePNG(w,h,pixels));
  console.log('  Created: '+filePath);
}
function grid(w,h,fill) { fill=fill===undefined?T:fill; const g=[]; for(let y=0;y<h;y++) g.push(new Array(w).fill(fill)); return g; }
function px(g,x,y,c){if(y>=0&&y<g.length&&x>=0&&x<g[0].length)g[y][x]=c;}
function fillRect(g,x0,y0,w,h,c){for(let y=y0;y<y0+h&&y<g.length;y++)for(let x=x0;x<x0+w&&x<g[0].length;x++)g[y][x]=c;}
function strokeRect(g,x0,y0,w,h,c){
  for(let x=x0;x<x0+w;x++){px(g,x,y0,c);px(g,x,y0+h-1,c);}
  for(let y=y0;y<y0+h;y++){px(g,x0,y,c);px(g,x0+w-1,y,c);}
}
function hLine(g,x0,x1,y,c){for(let x=x0;x<=x1;x++)px(g,x,y,c);}
function vLine(g,x,y0,y1,c){for(let y=y0;y<=y1;y++)px(g,x,y,c);}

const OUT_BUILDINGS = path.join(__dirname,'..','public','assets','nft','buildings');
const OUT_NFT = path.join(__dirname,'..','public','assets','nft');

// ============================================================================
// BUILDING SPRITES — 32x32 (2x of 16x16 parcel tile footprint)
// ============================================================================

// 1. HOUSE — small cozy cottage, brown walls + red roof + chimney smoke hint
console.log('\n=== Building: House (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  // Ground shadow ellipse
  const shadow=[0,0,0,90];
  for(let x=4;x<W-4;x++)px(g,x,30,shadow);
  for(let x=6;x<W-6;x++)px(g,x,31,shadow);

  // House body (walls): rows 16-29
  // Wall outline darkest, fill rich earth, highlight on left
  const wallDark=P.deepSoil, wallMid=P.richEarth, wallLight=P.dirt;
  fillRect(g,6,16,20,14,wallMid);
  // Vertical board lines
  for(let y=17;y<29;y++){px(g,11,y,wallDark);px(g,17,y,wallDark);px(g,22,y,wallDark);}
  // Wall outline
  strokeRect(g,6,16,20,14,wallDark);
  // Highlight strip on left
  for(let y=17;y<29;y++)px(g,7,y,wallLight);

  // Door — centered, dark with golden knob
  fillRect(g,14,22,4,8,P.deepSoil);
  strokeRect(g,14,22,4,8,P.black);
  px(g,16,22,P.darkRock);px(g,15,22,P.darkRock);
  // Door knob
  px(g,17,26,P.gold);

  // Window left (cyan glass with cross frame)
  fillRect(g,9,19,3,3,P.skyBlue);
  px(g,10,19,P.paleWater);px(g,9,19,P.highlight);
  strokeRect(g,8,18,5,5,wallDark);
  px(g,10,20,wallDark);hLine(g,8,12,20,wallDark);vLine(g,10,18,22,wallDark);
  fillRect(g,9,19,3,3,P.skyBlue);px(g,9,19,P.highlight);px(g,11,19,P.paleWater);
  px(g,9,21,P.oceanBlue);px(g,11,21,P.oceanBlue);

  // Window right
  fillRect(g,20,19,3,3,P.skyBlue);
  strokeRect(g,19,18,5,5,wallDark);
  hLine(g,19,23,20,wallDark);vLine(g,21,18,22,wallDark);
  fillRect(g,20,19,3,3,P.skyBlue);px(g,20,19,P.highlight);px(g,22,19,P.paleWater);
  px(g,20,21,P.oceanBlue);px(g,22,21,P.oceanBlue);

  // Roof — red triangular pitched roof, rows 7-16
  const roofDark=P.deepBlood, roofMid=P.enemyRed, roofLight=P.brightRed, roofShine=P.fireOrange;
  // Triangular roof from peak (16,7) sloping down to (4,16) and (27,16)
  // Build by scanning rows
  for(let y=7;y<=16;y++){
    const dy=y-7;
    const xL=15-Math.floor(dy*1.3); // slope ratio
    const xR=16+Math.floor(dy*1.3);
    for(let x=xL;x<=xR;x++)px(g,x,y,roofMid);
    // Edges
    px(g,xL,y,roofDark);px(g,xR,y,roofDark);
    // Highlight stripe
    if(dy>0)px(g,xL+1,y,roofLight);
  }
  // Roof eaves (slight overhang at base)
  hLine(g,4,27,15,roofDark);
  hLine(g,4,27,16,roofDark);
  // Shingle texture rows
  for(let y=10;y<=15;y+=2){
    for(let x=8;x<=24;x+=4){
      px(g,x,y,roofDark);
    }
  }
  // Roof peak shine
  px(g,15,7,roofDark);px(g,16,7,roofDark);
  px(g,15,8,roofShine);px(g,16,8,roofLight);

  // Chimney — top right of roof
  fillRect(g,21,4,3,5,P.stoneGray);
  strokeRect(g,21,4,3,5,P.darkRock);
  px(g,22,4,P.lightStone);
  // Smoke puff
  px(g,22,2,P.paleGray);px(g,23,2,P.lightStone);
  px(g,22,1,P.paleGray);

  // Path step at door
  px(g,15,30,P.midGray);px(g,16,30,P.lightStone);px(g,17,30,P.midGray);

  save(W,H,g,path.join(OUT_BUILDINGS,'building_house.png'));
})();

// 2. SHOP — market stall with red-and-white striped canopy
console.log('\n=== Building: Shop (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  const shadow=[0,0,0,90];
  for(let x=3;x<W-3;x++)px(g,x,30,shadow);
  for(let x=5;x<W-5;x++)px(g,x,31,shadow);

  // Counter base — wooden, rows 22-29
  const woodDark=P.deepSoil, woodMid=P.richEarth, woodLight=P.dirt;
  fillRect(g,4,22,24,8,woodMid);
  strokeRect(g,4,22,24,8,woodDark);
  // Counter top edge highlight
  hLine(g,5,26,22,woodLight);
  // Counter board separators
  for(let y=23;y<29;y++){px(g,10,y,woodDark);px(g,16,y,woodDark);px(g,22,y,woodDark);}
  // Front-facing horizontal countertop slab
  fillRect(g,3,21,26,2,P.dirt);
  strokeRect(g,3,21,26,2,woodDark);
  px(g,4,21,P.sand);px(g,5,21,P.sand);

  // Support posts (left and right)
  vLine(g,3,8,29,woodDark);
  vLine(g,28,8,29,woodDark);
  vLine(g,4,9,29,woodMid);
  vLine(g,27,9,29,woodMid);

  // Canopy — red & white stripes, scalloped bottom edge
  // Stripes from row 9-16, with arc top
  const stripeRed=P.brightRed, stripeWhite=P.paleGray, redDark=P.deepBlood;
  for(let y=10;y<=16;y++){
    const dy=y-10;
    // Arched top — narrower at top
    const inset = dy<2 ? 2-dy : 0;
    const xL=2+inset;
    const xR=29-inset;
    for(let x=xL;x<=xR;x++){
      // Vertical stripes every 3px, alternating
      const stripeIdx=Math.floor((x-xL)/3);
      px(g,x,y,(stripeIdx%2===0)?stripeRed:stripeWhite);
    }
    // Edges
    px(g,xL,y,redDark);px(g,xR,y,redDark);
  }
  // Canopy top arc shading
  hLine(g,4,27,9,redDark);
  hLine(g,4,27,10,redDark);
  px(g,3,11,redDark);px(g,28,11,redDark);
  // Scalloped bottom edge — alternating drop pixels
  for(let x=3;x<=28;x+=3){
    px(g,x,17,stripeRed);
    px(g,x+1,17,stripeRed);
  }
  for(let x=4;x<=27;x+=3){
    px(g,x,18,redDark);
  }

  // Canopy top peak/handle
  px(g,15,8,P.darkGold);px(g,16,8,P.gold);
  px(g,15,9,P.gold);px(g,16,9,P.brightYellow);

  // Goods on counter — pile of items: apple, bread loaf, coin stack
  // Apple (red) at left
  px(g,7,19,P.brightRed);px(g,8,19,P.brightRed);
  px(g,7,20,P.brightRed);px(g,8,20,P.deepBlood);
  px(g,7,18,P.deepForest);px(g,8,18,P.brightRed);
  // Bread loaf middle — golden brown
  fillRect(g,12,19,5,2,P.sand);
  px(g,12,20,P.dirt);px(g,16,20,P.dirt);
  px(g,13,18,P.desertGold);px(g,15,18,P.desertGold);
  px(g,14,18,P.paleSand);
  // Coin stack right
  fillRect(g,20,19,4,1,P.gold);
  fillRect(g,20,20,4,1,P.darkGold);
  px(g,20,19,P.brightYellow);px(g,21,19,P.brightYellow);
  // Sign posted on left support
  px(g,2,12,P.gold);px(g,2,13,P.gold);

  save(W,H,g,path.join(OUT_BUILDINGS,'building_shop.png'));
})();

// 3. GARDEN — wooden planter box with herbs/leaves growing out
console.log('\n=== Building: Garden (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  const shadow=[0,0,0,90];
  for(let x=4;x<W-4;x++)px(g,x,30,shadow);
  for(let x=6;x<W-6;x++)px(g,x,31,shadow);

  // Wooden planter box, rows 20-29
  const woodDark=P.deepSoil, woodMid=P.richEarth, woodLight=P.dirt;
  fillRect(g,4,20,24,10,woodMid);
  strokeRect(g,4,20,24,10,woodDark);
  // Plank lines
  for(let x=8;x<28;x+=4){
    vLine(g,x,21,29,woodDark);
  }
  // Top rim highlight
  hLine(g,5,26,20,woodLight);
  // Bottom edge shadow
  hLine(g,4,27,29,P.black);

  // Soil layer (top of planter)
  const soilDark=P.deepSoil, soilMid=P.richEarth;
  fillRect(g,5,18,22,3,soilDark);
  // Soil clumps
  for(let x=6;x<27;x+=3){
    px(g,x,18,soilMid);
    px(g,x+1,19,soilMid);
  }
  px(g,8,18,P.dirt);px(g,15,18,P.dirt);px(g,22,18,P.dirt);

  // Plant 1 — small herb left (tall slender stalks)
  const leafDark=P.deepForest, leafMid=P.forestGreen, leafLight=P.leafGreen, leafBright=P.brightGrass;
  vLine(g,8,12,18,leafMid);
  vLine(g,9,14,18,leafDark);
  px(g,7,13,leafLight);px(g,8,11,leafBright);
  px(g,7,15,leafMid);px(g,9,12,leafLight);

  // Plant 2 — center: bushy plant with red flower
  // Foliage
  for(let y=13;y<=18;y++){
    for(let x=13;x<=18;x++){
      const dx=x-15.5, dy=y-15.5;
      if(dx*dx+dy*dy<8) px(g,x,y,leafMid);
    }
  }
  // Highlights
  px(g,14,13,leafBright);px(g,15,13,leafLight);px(g,16,13,leafBright);
  px(g,13,15,leafLight);px(g,18,15,leafLight);
  px(g,14,16,leafBright);
  // Edges darker
  px(g,13,14,leafDark);px(g,18,14,leafDark);
  px(g,13,17,leafDark);px(g,18,17,leafDark);
  // Red flower on top
  px(g,15,11,P.brightRed);px(g,16,11,P.deepBlood);
  px(g,15,12,P.fireOrange);px(g,16,12,P.brightRed);

  // Plant 3 — right: tall sprout with three leaves
  vLine(g,22,13,18,leafMid);
  vLine(g,21,14,18,leafDark);
  px(g,23,14,leafLight);
  // Leaf pair
  px(g,20,15,leafMid);px(g,19,15,leafDark);
  px(g,24,15,leafMid);px(g,25,15,leafLight);
  px(g,20,12,leafLight);px(g,21,11,leafBright);
  px(g,22,10,leafLight);px(g,23,11,leafBright);
  px(g,21,12,leafMid);px(g,23,12,leafMid);

  // Decorative pebbles in soil
  px(g,11,19,P.midGray);px(g,12,19,P.lightStone);
  px(g,24,19,P.midGray);px(g,25,19,P.lightStone);

  save(W,H,g,path.join(OUT_BUILDINGS,'building_garden.png'));
})();

// ============================================================================
// UI ICONS — 32x32 (placement panel; spec says ~32x32)
// ============================================================================

// 4. ICON: HOUSE — simplified silhouette of building_house, framed
console.log('\n=== Icon: House (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  // Icon background frame (subtle dark panel)
  fillRect(g,1,1,W-2,H-2,[0x2b,0x2b,0x2b,180]);
  strokeRect(g,1,1,W-2,H-2,P.darkRock);
  strokeRect(g,2,2,W-4,H-4,P.deepSoil);
  // Corner accents
  px(g,2,2,P.gold);px(g,W-3,2,P.gold);px(g,2,H-3,P.gold);px(g,W-3,H-3,P.gold);

  // House body — centered, smaller version of the building
  const wallMid=P.richEarth, wallDark=P.deepSoil, wallLight=P.dirt;
  fillRect(g,9,18,14,9,wallMid);
  strokeRect(g,9,18,14,9,wallDark);
  vLine(g,10,19,26,wallLight);

  // Door
  fillRect(g,14,22,4,5,P.deepSoil);
  strokeRect(g,14,22,4,5,P.black);
  px(g,17,25,P.gold);

  // Windows
  fillRect(g,11,20,2,2,P.skyBlue);
  px(g,11,20,P.highlight);px(g,12,20,P.paleWater);
  strokeRect(g,11,20,2,2,wallDark);
  fillRect(g,11,20,2,2,P.skyBlue);px(g,11,20,P.highlight);

  fillRect(g,19,20,2,2,P.skyBlue);
  strokeRect(g,19,20,2,2,wallDark);
  fillRect(g,19,20,2,2,P.skyBlue);px(g,19,20,P.highlight);

  // Roof — triangular red
  const roofMid=P.enemyRed, roofDark=P.deepBlood, roofLight=P.brightRed;
  for(let y=10;y<=18;y++){
    const dy=y-10;
    const xL=15-dy;
    const xR=16+dy;
    for(let x=xL;x<=xR;x++)px(g,x,y,roofMid);
    px(g,xL,y,roofDark);px(g,xR,y,roofDark);
    if(dy>0)px(g,xL+1,y,roofLight);
  }
  // Roof base shadow
  hLine(g,7,24,17,roofDark);
  hLine(g,7,24,18,roofDark);
  // Peak
  px(g,15,10,roofDark);px(g,16,10,roofDark);

  // Chimney
  fillRect(g,19,7,2,3,P.stoneGray);
  strokeRect(g,19,7,2,3,P.darkRock);
  px(g,20,5,P.paleGray);

  save(W,H,g,path.join(OUT_NFT,'icon_building_house.png'));
})();

// 5. ICON: SHOP — striped canopy + counter
console.log('\n=== Icon: Shop (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  fillRect(g,1,1,W-2,H-2,[0x2b,0x2b,0x2b,180]);
  strokeRect(g,1,1,W-2,H-2,P.darkRock);
  strokeRect(g,2,2,W-4,H-4,P.deepSoil);
  px(g,2,2,P.gold);px(g,W-3,2,P.gold);px(g,2,H-3,P.gold);px(g,W-3,H-3,P.gold);

  // Counter base
  const woodMid=P.richEarth, woodDark=P.deepSoil, woodLight=P.dirt;
  fillRect(g,6,22,20,6,woodMid);
  strokeRect(g,6,22,20,6,woodDark);
  hLine(g,7,24,22,woodLight);
  vLine(g,12,23,27,woodDark);
  vLine(g,18,23,27,woodDark);
  // Countertop slab
  fillRect(g,5,21,22,2,P.dirt);
  strokeRect(g,5,21,22,2,woodDark);

  // Posts
  vLine(g,5,12,27,woodDark);
  vLine(g,26,12,27,woodDark);

  // Striped canopy
  const stripeRed=P.brightRed, stripeWhite=P.paleGray, redDark=P.deepBlood;
  for(let y=13;y<=18;y++){
    const dy=y-13;
    const inset=dy<2?1-dy:0;
    const xL=4+Math.max(inset,0);
    const xR=27-Math.max(inset,0);
    for(let x=xL;x<=xR;x++){
      const stripeIdx=Math.floor((x-xL)/3);
      px(g,x,y,(stripeIdx%2===0)?stripeRed:stripeWhite);
    }
    px(g,xL,y,redDark);px(g,xR,y,redDark);
  }
  hLine(g,5,26,12,redDark);
  // Scalloped edge
  for(let x=5;x<=26;x+=3){px(g,x,19,stripeRed);px(g,x+1,19,stripeRed);}

  // Single coin on counter
  px(g,15,20,P.gold);px(g,16,20,P.gold);
  px(g,15,21,P.darkGold);px(g,16,21,P.darkGold);
  px(g,15,20,P.brightYellow);

  save(W,H,g,path.join(OUT_NFT,'icon_building_shop.png'));
})();

// 6. ICON: GARDEN — planter with one big plant
console.log('\n=== Icon: Garden (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  fillRect(g,1,1,W-2,H-2,[0x2b,0x2b,0x2b,180]);
  strokeRect(g,1,1,W-2,H-2,P.darkRock);
  strokeRect(g,2,2,W-4,H-4,P.deepSoil);
  px(g,2,2,P.gold);px(g,W-3,2,P.gold);px(g,2,H-3,P.gold);px(g,W-3,H-3,P.gold);

  // Planter
  const woodMid=P.richEarth, woodDark=P.deepSoil, woodLight=P.dirt;
  fillRect(g,6,21,20,7,woodMid);
  strokeRect(g,6,21,20,7,woodDark);
  hLine(g,7,24,21,woodLight);
  vLine(g,11,22,27,woodDark);
  vLine(g,16,22,27,woodDark);
  vLine(g,21,22,27,woodDark);

  // Soil
  fillRect(g,7,19,18,2,P.deepSoil);
  for(let x=8;x<25;x+=3){px(g,x,19,P.richEarth);px(g,x+1,20,P.richEarth);}

  // Big plant in center
  const leafDark=P.deepForest, leafMid=P.forestGreen, leafLight=P.leafGreen, leafBright=P.brightGrass;

  // Stalk
  vLine(g,16,11,18,leafMid);
  vLine(g,15,12,18,leafDark);

  // Lower leaf pair
  px(g,13,16,leafMid);px(g,12,16,leafDark);px(g,14,16,leafLight);
  px(g,18,16,leafMid);px(g,19,16,leafDark);px(g,17,16,leafLight);
  px(g,12,17,leafDark);px(g,19,17,leafDark);

  // Mid leaf pair
  px(g,12,13,leafMid);px(g,11,13,leafDark);px(g,13,13,leafLight);
  px(g,19,13,leafMid);px(g,20,13,leafDark);px(g,18,13,leafLight);
  px(g,12,14,leafLight);px(g,19,14,leafLight);

  // Top crown (big bushy leaves)
  for(let y=8;y<=12;y++){
    for(let x=14;x<=18;x++){
      const dx=x-16, dy=y-10;
      if(dx*dx+dy*dy<6) px(g,x,y,leafMid);
    }
  }
  px(g,14,9,leafBright);px(g,18,9,leafBright);
  px(g,15,8,leafLight);px(g,17,8,leafLight);
  px(g,16,7,leafBright);
  px(g,13,10,leafDark);px(g,19,10,leafDark);

  // Red flower at top
  px(g,16,6,P.brightRed);px(g,15,6,P.deepBlood);
  px(g,16,5,P.fireOrange);

  // Pebbles
  px(g,9,20,P.midGray);px(g,23,20,P.lightStone);

  save(W,H,g,path.join(OUT_NFT,'icon_building_garden.png'));
})();

// 7. ICON: REMOVE — red X over a generic building silhouette (delete/undo)
console.log('\n=== Icon: Remove (32x32) ===');
(function(){
  const W=32,H=32,g=grid(W,H);
  fillRect(g,1,1,W-2,H-2,[0x2b,0x2b,0x2b,180]);
  strokeRect(g,1,1,W-2,H-2,P.darkRock);
  strokeRect(g,2,2,W-4,H-4,P.deepSoil);
  px(g,2,2,P.gold);px(g,W-3,2,P.gold);px(g,2,H-3,P.gold);px(g,W-3,H-3,P.gold);

  // Faded grayscale building silhouette in background
  const ghost=[0x6e,0x6e,0x6e,140], ghostDark=[0x4a,0x4a,0x4a,140];
  // House body
  fillRect(g,9,17,14,10,ghost);
  strokeRect(g,9,17,14,10,ghostDark);
  // Door
  fillRect(g,14,21,4,6,ghostDark);
  // Roof triangle
  for(let y=10;y<=17;y++){
    const dy=y-10;
    const xL=15-dy;
    const xR=16+dy;
    for(let x=xL;x<=xR;x++)px(g,x,y,ghost);
    px(g,xL,y,ghostDark);px(g,xR,y,ghostDark);
  }
  hLine(g,7,24,17,ghostDark);

  // Big red X overlay (forbidden / remove)
  const xRed=P.brightRed, xDark=P.deepBlood, xLight=P.fireOrange;
  // Diagonal 1: top-left to bottom-right
  for(let i=0;i<22;i++){
    const x=5+i, y=5+i;
    px(g,x,y,xRed);
    px(g,x+1,y,xDark);
    px(g,x,y+1,xDark);
    px(g,x-1,y,xLight);
    px(g,x,y-1,xLight);
  }
  // Diagonal 2: top-right to bottom-left
  for(let i=0;i<22;i++){
    const x=26-i, y=5+i;
    px(g,x,y,xRed);
    px(g,x-1,y,xDark);
    px(g,x,y+1,xDark);
    px(g,x+1,y,xLight);
    px(g,x,y-1,xLight);
  }
  // Center brighter
  px(g,15,15,xLight);px(g,16,15,xLight);
  px(g,15,16,xLight);px(g,16,16,xLight);
  px(g,16,15,P.brightYellow);
  px(g,15,16,P.brightYellow);

  save(W,H,g,path.join(OUT_NFT,'icon_building_remove.png'));
})();

console.log('\n=== All building assets generated! ===');
console.log('Sprites: public/assets/nft/buildings/  (3 files)');
console.log('Icons:   public/assets/nft/             (4 files)');
