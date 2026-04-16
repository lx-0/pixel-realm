#!/usr/bin/env node
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');
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
const T = null;
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
const OUT = path.join(__dirname, '..', 'public', 'assets', 'nft');
function grid(w,h,fill) { fill=fill===undefined?T:fill; const g=[]; for(let y=0;y<h;y++) g.push(new Array(w).fill(fill)); return g; }
function fillRect(g,x0,y0,w,h,color) { for(let y=y0;y<y0+h&&y<g.length;y++) for(let x=x0;x<x0+w&&x<g[0].length;x++) g[y][x]=color; }
function strokeRect(g,x0,y0,w,h,color) {
  for(let x=x0;x<x0+w&&x<g[0].length;x++){if(y0>=0&&y0<g.length)g[y0][x]=color;if(y0+h-1>=0&&y0+h-1<g.length)g[y0+h-1][x]=color;}
  for(let y=y0;y<y0+h&&y<g.length;y++){if(x0>=0&&x0<g[0].length)g[y][x0]=color;if(x0+w-1>=0&&x0+w-1<g[0].length)g[y][x0+w-1]=color;}
}
function px(g,x,y,color){if(y>=0&&y<g.length&&x>=0&&x<g[0].length)g[y][x]=color;}
function drawDivider(g,y,x0,x1,color){for(let x=x0;x<=x1&&x<g[0].length;x++){if(y>=0&&y<g.length)g[y][x]=color;}}
function drawPanelFrame(g,w,h) {
  fillRect(g,0,0,w,h,P.darkRock);strokeRect(g,0,0,w,h,P.deepSoil);strokeRect(g,1,1,w-2,h-2,P.richEarth);
  fillRect(g,2,2,w-4,h-4,P.darkRock);px(g,2,2,P.gold);px(g,w-3,2,P.gold);px(g,2,h-3,P.gold);px(g,w-3,h-3,P.gold);
  for(let x=12;x<w-4;x+=10){px(g,x,0,P.gold);px(g,x,h-1,P.gold);}
  for(let y=12;y<h-4;y+=10){px(g,0,y,P.gold);px(g,w-1,y,P.gold);}
}
function drawLabelBar(g,x0,y0,w,h,bgColor,textColor) {
  fillRect(g,x0,y0,w,h,bgColor);let textY=y0+Math.floor(h/2),startX=x0+4;
  for(let i=0;i<Math.min(w-8,20);i+=3){px(g,startX+i,textY,textColor);px(g,startX+i+1,textY,textColor);}
}
function drawButton(g,x0,y0,w,h,bgColor,borderColor,textColor) {
  fillRect(g,x0,y0,w,h,bgColor);strokeRect(g,x0,y0,w,h,borderColor);
  let textY=y0+Math.floor(h/2),startX=x0+Math.floor(w/4);
  for(let i=0;i<Math.floor(w/2);i+=3){px(g,startX+i,textY,textColor);px(g,startX+i+1,textY,textColor);}
}

// 1. NFT BADGE OVERLAY (16x16)
console.log('\n=== NFT Badge Overlay (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  px(g,7,1,P.deepOcean);px(g,8,1,P.deepOcean);
  for(let x=6;x<=9;x++)px(g,x,2,P.deepOcean);
  for(let x=5;x<=10;x++)px(g,x,3,P.oceanBlue);
  for(let x=4;x<=11;x++)px(g,x,4,P.oceanBlue);
  px(g,7,3,P.playerBlue);px(g,8,3,P.playerBlue);
  px(g,6,4,P.skyBlue);px(g,7,4,P.paleWater);px(g,8,4,P.highlight);px(g,9,4,P.skyBlue);
  px(g,5,5,P.skyBlue);px(g,6,5,P.playerBlue);px(g,7,5,P.paleWater);px(g,8,5,P.paleWater);px(g,9,5,P.playerBlue);px(g,10,5,P.skyBlue);
  px(g,4,6,P.oceanBlue);px(g,5,6,P.skyBlue);px(g,6,6,P.playerBlue);px(g,7,6,P.highlight);px(g,8,6,P.paleWater);px(g,9,6,P.playerBlue);px(g,10,6,P.skyBlue);px(g,11,6,P.oceanBlue);
  px(g,3,7,P.deepOcean);px(g,4,7,P.oceanBlue);px(g,5,7,P.skyBlue);px(g,6,7,P.playerBlue);px(g,7,7,P.paleWater);px(g,8,7,P.highlight);px(g,9,7,P.playerBlue);px(g,10,7,P.skyBlue);px(g,11,7,P.oceanBlue);px(g,12,7,P.deepOcean);
  px(g,3,8,P.deepOcean);px(g,4,8,P.oceanBlue);px(g,5,8,P.skyBlue);px(g,6,8,P.playerBlue);px(g,7,8,P.playerBlue);px(g,8,8,P.paleWater);px(g,9,8,P.skyBlue);px(g,10,8,P.skyBlue);px(g,11,8,P.oceanBlue);px(g,12,8,P.deepOcean);
  px(g,4,9,P.oceanBlue);px(g,5,9,P.skyBlue);px(g,6,9,P.playerBlue);px(g,7,9,P.playerBlue);px(g,8,9,P.skyBlue);px(g,9,9,P.skyBlue);px(g,10,9,P.oceanBlue);px(g,11,9,P.oceanBlue);
  px(g,5,10,P.oceanBlue);px(g,6,10,P.skyBlue);px(g,7,10,P.playerBlue);px(g,8,10,P.skyBlue);px(g,9,10,P.oceanBlue);px(g,10,10,P.oceanBlue);
  px(g,6,11,P.oceanBlue);px(g,7,11,P.skyBlue);px(g,8,11,P.oceanBlue);px(g,9,11,P.oceanBlue);
  px(g,7,12,P.oceanBlue);px(g,8,12,P.deepOcean);
  px(g,6,13,P.lightStone);px(g,7,13,P.midGray);px(g,8,13,P.lightStone);px(g,7,14,P.midGray);
  save(W,H,g,path.join(OUT,'nft_badge_overlay.png'));
})();

// 2. NFT MINTING BADGE (16x16)
console.log('\n=== NFT Minting Badge (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let x=5;x<=10;x++)px(g,x,2,P.darkGold);
  for(let x=4;x<=11;x++)px(g,x,3,P.darkGold);
  px(g,3,4,P.darkGold);px(g,4,4,P.gold);px(g,11,4,P.gold);px(g,12,4,P.darkGold);
  px(g,3,5,P.darkGold);px(g,4,5,P.gold);px(g,12,5,P.darkGold);
  px(g,2,6,P.darkGold);px(g,3,6,P.gold);px(g,12,6,P.gold);px(g,13,6,P.darkGold);
  px(g,2,7,P.darkGold);px(g,3,7,P.gold);px(g,12,7,P.gold);px(g,13,7,P.darkGold);
  px(g,2,8,P.darkGold);px(g,3,8,P.gold);px(g,12,8,P.gold);px(g,13,8,P.darkGold);
  px(g,2,9,P.darkGold);px(g,3,9,P.gold);
  px(g,3,10,P.darkGold);px(g,4,10,P.gold);px(g,11,10,P.gold);px(g,12,10,P.darkGold);
  for(let x=4;x<=11;x++)px(g,x,11,P.darkGold);
  for(let x=5;x<=10;x++)px(g,x,12,P.darkGold);
  px(g,11,5,P.brightYellow);px(g,12,5,P.brightYellow);px(g,13,5,P.gold);px(g,12,4,P.brightYellow);px(g,13,4,P.gold);
  px(g,7,6,P.lightStone);px(g,8,6,P.lightStone);px(g,7,7,P.paleGray);px(g,8,7,P.paleGray);
  px(g,6,8,P.midGray);px(g,7,8,P.lightStone);px(g,8,8,P.lightStone);px(g,9,8,P.midGray);
  px(g,6,9,P.stoneGray);px(g,7,9,P.midGray);px(g,8,9,P.midGray);px(g,9,9,P.stoneGray);
  px(g,5,5,P.brightYellow);px(g,10,9,P.brightYellow);
  save(W,H,g,path.join(OUT,'nft_badge_minting.png'));
})();

// 3. NFT RARITY FRAMES (18x18)
console.log('\n=== NFT Rarity Border Frames (18x18 each) ===');
const RT={
  common:{outer:P.stoneGray,inner:P.midGray,corner:P.lightStone,glow:P.paleGray},
  rare:{outer:P.oceanBlue,inner:P.skyBlue,corner:P.playerBlue,glow:P.paleWater},
  epic:{outer:P.magicPurple,inner:P.manaViolet,corner:P.spellGlow,glow:P.spellGlow},
  legendary:{outer:P.darkGold,inner:P.gold,corner:P.brightYellow,glow:P.paleHighlight},
};
Object.entries(RT).forEach(([rarity,theme])=>{
  let W=18,H=18,g=grid(W,H);
  strokeRect(g,0,0,W,H,theme.outer);strokeRect(g,1,1,W-2,H-2,theme.inner);
  px(g,0,0,theme.corner);px(g,1,0,theme.corner);px(g,0,1,theme.corner);
  px(g,W-1,0,theme.corner);px(g,W-2,0,theme.corner);px(g,W-1,1,theme.corner);
  px(g,0,H-1,theme.corner);px(g,1,H-1,theme.corner);px(g,0,H-2,theme.corner);
  px(g,W-1,H-1,theme.corner);px(g,W-2,H-1,theme.corner);px(g,W-1,H-2,theme.corner);
  if(rarity==='epic'||rarity==='legendary'){
    px(g,Math.floor(W/2),0,theme.glow);px(g,Math.floor(W/2),H-1,theme.glow);
    px(g,0,Math.floor(H/2),theme.glow);px(g,W-1,Math.floor(H/2),theme.glow);
  }
  if(rarity==='legendary'){
    px(g,5,0,P.brightYellow);px(g,12,0,P.brightYellow);px(g,5,H-1,P.brightYellow);px(g,12,H-1,P.brightYellow);
    px(g,0,5,P.brightYellow);px(g,0,12,P.brightYellow);px(g,W-1,5,P.brightYellow);px(g,W-1,12,P.brightYellow);
  }
  px(g,W-4,2,theme.corner);px(g,W-5,3,theme.inner);px(g,W-4,3,theme.glow);px(g,W-3,3,theme.inner);px(g,W-4,4,theme.corner);
  save(W,H,g,path.join(OUT,'nft_frame_'+rarity+'.png'));
});

// 4. MINTING ANIMATION (96x16, 6 frames)
console.log('\n=== Minting Animation Effect (96x16) ===');
(function(){
  let FW=16,FH=16,FR=6,W=FW*FR,H=FH,g=grid(W,H);
  const particles=[
    [{x:7,y:7,c:P.paleHighlight},{x:8,y:7,c:P.paleHighlight},{x:7,y:8,c:P.brightYellow},{x:8,y:8,c:P.brightYellow}],
    [{x:7,y:6,c:P.brightYellow},{x:8,y:6,c:P.brightYellow},{x:6,y:7,c:P.gold},{x:9,y:7,c:P.gold},{x:7,y:7,c:P.paleHighlight},{x:8,y:7,c:P.paleHighlight},{x:7,y:8,c:P.paleHighlight},{x:8,y:8,c:P.paleHighlight},{x:6,y:8,c:P.gold},{x:9,y:8,c:P.gold},{x:7,y:9,c:P.brightYellow},{x:8,y:9,c:P.brightYellow}],
    [{x:7,y:4,c:P.gold},{x:8,y:4,c:P.gold},{x:5,y:5,c:P.brightYellow},{x:10,y:5,c:P.brightYellow},{x:4,y:7,c:P.gold},{x:11,y:7,c:P.gold},{x:4,y:8,c:P.gold},{x:11,y:8,c:P.gold},{x:5,y:10,c:P.brightYellow},{x:10,y:10,c:P.brightYellow},{x:7,y:11,c:P.gold},{x:8,y:11,c:P.gold},{x:7,y:7,c:P.paleHighlight},{x:8,y:8,c:P.paleHighlight}],
    [{x:7,y:2,c:P.darkGold},{x:8,y:2,c:P.darkGold},{x:4,y:4,c:P.gold},{x:11,y:4,c:P.gold},{x:2,y:7,c:P.brightYellow},{x:13,y:7,c:P.brightYellow},{x:3,y:8,c:P.gold},{x:12,y:8,c:P.gold},{x:4,y:11,c:P.gold},{x:11,y:11,c:P.gold},{x:7,y:13,c:P.darkGold},{x:8,y:13,c:P.darkGold},{x:6,y:3,c:P.paleHighlight},{x:10,y:3,c:P.paleHighlight},{x:3,y:6,c:P.paleHighlight},{x:12,y:10,c:P.paleHighlight}],
    [{x:6,y:1,c:P.darkGold},{x:9,y:1,c:P.darkGold},{x:3,y:3,c:P.gold},{x:12,y:3,c:P.gold},{x:1,y:6,c:P.darkGold},{x:14,y:6,c:P.darkGold},{x:1,y:9,c:P.darkGold},{x:14,y:9,c:P.darkGold},{x:3,y:12,c:P.gold},{x:12,y:12,c:P.gold},{x:6,y:14,c:P.darkGold},{x:9,y:14,c:P.darkGold}],
    [{x:5,y:0,c:P.darkGold},{x:10,y:0,c:P.darkGold},{x:2,y:2,c:P.darkGold},{x:13,y:2,c:P.darkGold},{x:0,y:7,c:P.darkGold},{x:15,y:7,c:P.darkGold},{x:2,y:13,c:P.darkGold},{x:13,y:13,c:P.darkGold},{x:7,y:15,c:P.darkGold}],
  ];
  particles.forEach((frame,fi)=>{let ox=fi*FW;frame.forEach(p=>px(g,ox+p.x,p.y,p.c));});
  save(W,H,g,path.join(OUT,'nft_effect_minting.png'));
})();

// 5. MARKETPLACE PANEL (220x180)
console.log('\n=== NFT Marketplace Panel (220x180) ===');
(function(){
  let W=220,H=180,g=grid(W,H);
  drawPanelFrame(g,W,H);
  fillRect(g,3,3,W-6,14,P.deepOcean);drawLabelBar(g,3,3,W-6,14,P.deepOcean,P.playerBlue);
  px(g,6,6,P.playerBlue);px(g,7,7,P.skyBlue);px(g,8,7,P.highlight);px(g,7,8,P.skyBlue);px(g,8,8,P.playerBlue);px(g,7,9,P.oceanBlue);
  fillRect(g,4,19,160,12,P.black);strokeRect(g,4,19,160,12,P.stoneGray);
  px(g,7,22,P.midGray);px(g,8,22,P.midGray);px(g,7,23,P.midGray);px(g,8,23,P.midGray);px(g,9,24,P.midGray);px(g,10,25,P.midGray);
  let tabW=40,tabH=10;
  for(let ti=0;ti<4;ti++){let tx=4+ti*(tabW+2);fillRect(g,tx,33,tabW,tabH,ti===0?P.oceanBlue:P.darkRock);strokeRect(g,tx,33,tabW,tabH,ti===0?P.skyBlue:P.stoneGray);for(let dx=4;dx<tabW-4;dx+=3){px(g,tx+dx,37,ti===0?P.nearWhite:P.midGray);px(g,tx+dx+1,37,ti===0?P.nearWhite:P.midGray);}}
  drawButton(g,W-60,19,54,12,P.deepForest,P.forestGreen,P.brightGrass);
  fillRect(g,4,45,W-8,10,P.deepSoil);
  [4,80,130,170].forEach(cx=>{for(let dx=2;dx<30;dx+=3){px(g,cx+dx,49,P.desertGold);px(g,cx+dx+1,49,P.desertGold);}});
  let rarityColors=[P.midGray,P.skyBlue,P.manaViolet,P.gold,P.midGray];
  for(let row=0;row<5;row++){
    let ry=57+row*22,bg=row%2===0?P.darkRock:P.black;
    fillRect(g,4,ry,W-8,20,bg);strokeRect(g,4,ry,W-8,20,P.stoneGray);
    fillRect(g,6,ry+2,16,16,P.black);strokeRect(g,6,ry+2,16,16,P.midGray);fillRect(g,9,ry+5,10,10,P.stoneGray);
    if(row<2){px(g,19,ry+2,P.playerBlue);px(g,20,ry+3,P.skyBlue);}
    px(g,82,ry+6,P.playerBlue);px(g,83,ry+7,P.skyBlue);px(g,82,ry+8,P.playerBlue);
    for(let dx=86;dx<110;dx+=3){px(g,dx,ry+7,P.gold);px(g,dx+1,ry+7,P.gold);}
    px(g,135,ry+7,rarityColors[row]);px(g,136,ry+7,rarityColors[row]);px(g,135,ry+8,rarityColors[row]);px(g,136,ry+8,rarityColors[row]);
  }
  fillRect(g,4,H-20,W-8,16,P.deepSoil);
  for(let i=0;i<5;i++){let dx=Math.floor(W/2)-12+i*6;px(g,dx,H-13,i===0?P.gold:P.midGray);px(g,dx+1,H-13,i===0?P.gold:P.midGray);}
  px(g,Math.floor(W/2)-20,H-13,P.paleGray);px(g,Math.floor(W/2)+20,H-13,P.paleGray);
  save(W,H,g,path.join(OUT,'ui_panel_nft_marketplace.png'));
})();

// 6. NFT DETAIL PANEL (160x200)
console.log('\n=== NFT Detail Panel (160x200) ===');
(function(){
  let W=160,H=200,g=grid(W,H);
  drawPanelFrame(g,W,H);
  px(g,W-8,4,P.brightRed);px(g,W-7,4,P.brightRed);px(g,W-8,5,P.brightRed);px(g,W-7,5,P.brightRed);
  fillRect(g,20,8,120,80,P.black);strokeRect(g,20,8,120,80,P.oceanBlue);strokeRect(g,21,9,118,78,P.skyBlue);
  fillRect(g,64,32,32,32,P.stoneGray);strokeRect(g,64,32,32,32,P.lightStone);
  px(g,24,12,P.playerBlue);px(g,25,12,P.skyBlue);px(g,24,13,P.skyBlue);px(g,25,13,P.playerBlue);
  fillRect(g,4,92,W-8,14,P.deepOcean);drawLabelBar(g,4,92,W-8,14,P.deepOcean,P.paleWater);
  [{c:P.manaViolet},{c:P.brightGrass},{c:P.playerBlue},{c:P.gold}].forEach((prop,i)=>{
    let py=110+i*14;
    for(let dx=6;dx<40;dx+=3){px(g,dx,py+4,P.midGray);px(g,dx+1,py+4,P.midGray);}
    for(let dx=50;dx<100;dx+=3){px(g,dx,py+4,prop.c);px(g,dx+1,py+4,prop.c);}
    drawDivider(g,py+12,4,W-5,P.deepSoil);
  });
  fillRect(g,4,166,W-8,14,P.deepSoil);
  px(g,8,170,P.playerBlue);px(g,9,171,P.skyBlue);px(g,8,172,P.playerBlue);
  for(let dx=14;dx<60;dx+=3){px(g,dx,172,P.gold);px(g,dx+1,172,P.gold);}
  drawButton(g,20,H-28,120,20,P.deepForest,P.forestGreen,P.brightGrass);
  for(let dx=40;dx<100;dx+=4){px(g,dx,H-19,P.nearWhite);px(g,dx+1,H-19,P.nearWhite);px(g,dx+2,H-19,P.nearWhite);}
  save(W,H,g,path.join(OUT,'ui_panel_nft_detail.png'));
})();

// 7. PURCHASE CONFIRM DIALOG (140x100)
console.log('\n=== NFT Purchase Confirm (140x100) ===');
(function(){
  let W=140,H=100,g=grid(W,H);
  drawPanelFrame(g,W,H);fillRect(g,3,3,W-6,14,P.deepOcean);drawLabelBar(g,3,3,W-6,14,P.deepOcean,P.paleWater);
  px(g,10,25,P.gold);px(g,11,25,P.gold);px(g,9,26,P.gold);px(g,12,26,P.gold);
  px(g,10,27,P.brightYellow);px(g,11,27,P.brightYellow);px(g,10,28,P.brightYellow);px(g,11,28,P.brightYellow);
  px(g,10,30,P.brightYellow);px(g,11,30,P.brightYellow);px(g,9,31,P.gold);px(g,12,31,P.gold);px(g,10,32,P.gold);px(g,11,32,P.gold);
  for(let dx=20;dx<130;dx+=3){px(g,dx,26,P.nearWhite);px(g,dx+1,26,P.nearWhite);}
  px(g,20,36,P.playerBlue);px(g,21,37,P.skyBlue);px(g,20,38,P.playerBlue);
  for(let dx=26;dx<80;dx+=3){px(g,dx,37,P.gold);px(g,dx+1,37,P.gold);}
  for(let dx=20;dx<60;dx+=3){px(g,dx,48,P.midGray);px(g,dx+1,48,P.midGray);}
  for(let dx=65;dx<100;dx+=3){px(g,dx,48,P.lightStone);px(g,dx+1,48,P.lightStone);}
  drawDivider(g,56,4,W-5,P.richEarth);
  for(let dx=20;dx<50;dx+=3){px(g,dx,62,P.nearWhite);px(g,dx+1,62,P.nearWhite);}
  for(let dx=60;dx<110;dx+=3){px(g,dx,62,P.brightYellow);px(g,dx+1,62,P.brightYellow);}
  drawButton(g,8,H-24,58,16,P.deepForest,P.forestGreen,P.brightGrass);
  drawButton(g,W-66,H-24,58,16,P.deepBlood,P.enemyRed,P.ember);
  save(W,H,g,path.join(OUT,'ui_dialog_nft_confirm.png'));
})();

// 8. ETH TOKEN ICON (16x16)
console.log('\n=== ETH Token Icon (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  px(g,7,1,P.paleWater);px(g,8,1,P.paleWater);
  px(g,6,2,P.skyBlue);px(g,7,2,P.highlight);px(g,8,2,P.paleWater);px(g,9,2,P.skyBlue);
  px(g,5,3,P.skyBlue);px(g,6,3,P.playerBlue);px(g,7,3,P.highlight);px(g,8,3,P.paleWater);px(g,9,3,P.playerBlue);px(g,10,3,P.skyBlue);
  px(g,5,4,P.oceanBlue);px(g,6,4,P.skyBlue);px(g,7,4,P.playerBlue);px(g,8,4,P.highlight);px(g,9,4,P.skyBlue);px(g,10,4,P.oceanBlue);
  px(g,4,5,P.oceanBlue);px(g,5,5,P.skyBlue);px(g,6,5,P.playerBlue);px(g,7,5,P.paleWater);px(g,8,5,P.highlight);px(g,9,5,P.playerBlue);px(g,10,5,P.skyBlue);px(g,11,5,P.oceanBlue);
  px(g,4,6,P.deepOcean);px(g,5,6,P.oceanBlue);px(g,6,6,P.skyBlue);px(g,7,6,P.playerBlue);px(g,8,6,P.paleWater);px(g,9,6,P.skyBlue);px(g,10,6,P.oceanBlue);px(g,11,6,P.deepOcean);
  px(g,3,7,P.deepOcean);px(g,4,7,P.oceanBlue);px(g,5,7,P.skyBlue);px(g,6,7,P.playerBlue);px(g,7,7,P.paleWater);px(g,8,7,P.highlight);px(g,9,7,P.playerBlue);px(g,10,7,P.skyBlue);px(g,11,7,P.oceanBlue);px(g,12,7,P.deepOcean);
  px(g,3,8,P.deepOcean);px(g,4,8,P.oceanBlue);px(g,5,8,P.skyBlue);px(g,6,8,P.playerBlue);px(g,7,8,P.playerBlue);px(g,8,8,P.skyBlue);px(g,9,8,P.skyBlue);px(g,10,8,P.oceanBlue);px(g,11,8,P.oceanBlue);px(g,12,8,P.deepOcean);
  px(g,4,9,P.deepOcean);px(g,5,9,P.oceanBlue);px(g,6,9,P.skyBlue);px(g,7,9,P.playerBlue);px(g,8,9,P.skyBlue);px(g,9,9,P.oceanBlue);px(g,10,9,P.oceanBlue);px(g,11,9,P.deepOcean);
  px(g,4,10,P.deepOcean);px(g,5,10,P.oceanBlue);px(g,6,10,P.skyBlue);px(g,7,10,P.skyBlue);px(g,8,10,P.oceanBlue);px(g,9,10,P.oceanBlue);px(g,10,10,P.deepOcean);px(g,11,10,P.deepOcean);
  px(g,5,11,P.deepOcean);px(g,6,11,P.oceanBlue);px(g,7,11,P.skyBlue);px(g,8,11,P.oceanBlue);px(g,9,11,P.oceanBlue);px(g,10,11,P.deepOcean);
  px(g,6,12,P.deepOcean);px(g,7,12,P.oceanBlue);px(g,8,12,P.oceanBlue);px(g,9,12,P.deepOcean);
  px(g,7,13,P.deepOcean);px(g,8,13,P.deepOcean);px(g,7,14,P.deepOcean);
  save(W,H,g,path.join(OUT,'icon_token_eth.png'));
})();

// 9. BASE CHAIN ICON (16x16)
console.log('\n=== Base Chain Icon (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let x=5;x<=10;x++)px(g,x,2,P.oceanBlue);
  for(let x=4;x<=11;x++)px(g,x,3,P.oceanBlue);
  for(let x=3;x<=12;x++){px(g,x,4,P.oceanBlue);px(g,x,5,P.oceanBlue);}
  for(let x=2;x<=13;x++){for(let y=6;y<=9;y++)px(g,x,y,P.oceanBlue);}
  for(let x=3;x<=12;x++){px(g,x,10,P.oceanBlue);px(g,x,11,P.oceanBlue);}
  for(let x=4;x<=11;x++)px(g,x,12,P.oceanBlue);
  for(let x=5;x<=10;x++)px(g,x,13,P.oceanBlue);
  for(let x=6;x<=9;x++)px(g,x,4,P.skyBlue);
  for(let x=5;x<=10;x++)px(g,x,5,P.skyBlue);
  for(let x=4;x<=11;x++){for(let y=6;y<=9;y++)px(g,x,y,P.skyBlue);}
  for(let x=5;x<=10;x++)px(g,x,10,P.skyBlue);
  for(let x=6;x<=9;x++)px(g,x,11,P.skyBlue);
  for(let y=5;y<=10;y++)px(g,6,y,P.nearWhite);
  px(g,7,5,P.nearWhite);px(g,8,5,P.nearWhite);px(g,7,7,P.nearWhite);px(g,8,7,P.nearWhite);
  px(g,7,10,P.nearWhite);px(g,8,10,P.nearWhite);px(g,9,6,P.nearWhite);px(g,9,8,P.nearWhite);px(g,9,9,P.nearWhite);
  save(W,H,g,path.join(OUT,'icon_token_base.png'));
})();

// 10. WALLET CONNECTED (16x16)
console.log('\n=== Wallet Connected Icon (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let x=5;x<=10;x++)px(g,x,1,P.forestGreen);
  for(let x=4;x<=11;x++)px(g,x,2,P.forestGreen);
  for(let x=3;x<=12;x++){for(let y=3;y<=7;y++)px(g,x,y,P.forestGreen);}
  for(let x=4;x<=11;x++){px(g,x,8,P.forestGreen);px(g,x,9,P.forestGreen);}
  for(let x=5;x<=10;x++){px(g,x,10,P.forestGreen);px(g,x,11,P.forestGreen);}
  for(let x=6;x<=9;x++)px(g,x,12,P.forestGreen);
  px(g,7,13,P.forestGreen);px(g,8,13,P.forestGreen);
  for(let x=5;x<=10;x++){for(let y=3;y<=8;y++)px(g,x,y,P.leafGreen);}
  for(let x=6;x<=9;x++){px(g,x,9,P.leafGreen);px(g,x,10,P.leafGreen);}
  px(g,7,11,P.leafGreen);px(g,8,11,P.leafGreen);
  px(g,5,7,P.brightGrass);px(g,6,8,P.brightGrass);px(g,7,9,P.lightFoliage);
  px(g,8,8,P.lightFoliage);px(g,9,7,P.brightGrass);px(g,10,6,P.brightGrass);px(g,11,5,P.brightGrass);
  save(W,H,g,path.join(OUT,'icon_wallet_connected.png'));
})();

// 11. WALLET DISCONNECTED (16x16)
console.log('\n=== Wallet Disconnected Icon (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let x=5;x<=10;x++)px(g,x,1,P.enemyRed);
  for(let x=4;x<=11;x++)px(g,x,2,P.enemyRed);
  for(let x=3;x<=12;x++){for(let y=3;y<=7;y++)px(g,x,y,P.enemyRed);}
  for(let x=4;x<=11;x++){px(g,x,8,P.enemyRed);px(g,x,9,P.enemyRed);}
  for(let x=5;x<=10;x++){px(g,x,10,P.enemyRed);px(g,x,11,P.enemyRed);}
  for(let x=6;x<=9;x++)px(g,x,12,P.enemyRed);
  px(g,7,13,P.enemyRed);px(g,8,13,P.enemyRed);
  for(let x=5;x<=10;x++){for(let y=3;y<=8;y++)px(g,x,y,P.brightRed);}
  for(let x=6;x<=9;x++){px(g,x,9,P.brightRed);px(g,x,10,P.brightRed);}
  px(g,7,11,P.brightRed);px(g,8,11,P.brightRed);
  px(g,5,5,P.nearWhite);px(g,6,6,P.nearWhite);px(g,7,7,P.nearWhite);px(g,8,8,P.nearWhite);px(g,9,9,P.nearWhite);
  px(g,9,5,P.nearWhite);px(g,8,6,P.nearWhite);px(g,6,8,P.nearWhite);px(g,5,9,P.nearWhite);
  save(W,H,g,path.join(OUT,'icon_wallet_disconnected.png'));
})();

// 12. LAND DEED (16x16)
console.log('\n=== Land Deed Item (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let x=4;x<=11;x++)for(let y=3;y<=12;y++)px(g,x,y,P.paleSand);
  for(let y=3;y<=12;y++)px(g,3,y,P.desertGold);
  for(let y=4;y<=11;y++)px(g,2,y,P.sand);
  for(let y=3;y<=12;y++)px(g,12,y,P.desertGold);
  for(let y=4;y<=11;y++)px(g,13,y,P.sand);
  for(let x=4;x<=11;x++){px(g,x,3,P.desertGold);px(g,x,12,P.desertGold);}
  for(let dx=5;dx<=10;dx+=2)px(g,dx,5,P.richEarth);
  for(let dx=5;dx<=9;dx+=2)px(g,dx,7,P.richEarth);
  for(let dx=5;dx<=10;dx+=2)px(g,dx,9,P.richEarth);
  px(g,7,10,P.brightRed);px(g,8,10,P.enemyRed);px(g,7,11,P.brightRed);px(g,8,11,P.brightRed);
  px(g,6,13,P.enemyRed);px(g,7,14,P.brightRed);px(g,9,13,P.enemyRed);px(g,8,14,P.brightRed);
  save(W,H,g,path.join(OUT,'item_land_deed.png'));
})();

// 13. TERRITORY MARKER OWN (16x16)
console.log('\n=== Territory Marker - Own (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let y=3;y<=14;y++)px(g,4,y,P.lightStone);px(g,4,15,P.midGray);
  for(let x=5;x<=12;x++)for(let y=3;y<=9;y++)px(g,x,y,P.playerBlue);
  for(let x=5;x<=12;x++)px(g,x,3,P.paleWater);
  px(g,5,10,P.playerBlue);px(g,6,10,P.skyBlue);px(g,8,10,P.playerBlue);px(g,9,10,P.skyBlue);px(g,11,10,P.playerBlue);px(g,12,10,P.skyBlue);
  px(g,8,5,P.nearWhite);px(g,9,5,P.nearWhite);
  px(g,7,6,P.nearWhite);px(g,8,6,P.highlight);px(g,9,6,P.highlight);px(g,10,6,P.nearWhite);
  px(g,7,7,P.nearWhite);px(g,8,7,P.highlight);px(g,9,7,P.highlight);px(g,10,7,P.nearWhite);
  px(g,8,8,P.nearWhite);px(g,9,8,P.nearWhite);
  px(g,3,2,P.gold);px(g,4,2,P.brightYellow);px(g,5,2,P.gold);px(g,4,1,P.brightYellow);
  save(W,H,g,path.join(OUT,'marker_territory_own.png'));
})();

// 14. TERRITORY MARKER OTHER (16x16)
console.log('\n=== Territory Marker - Other (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  for(let y=3;y<=14;y++)px(g,4,y,P.lightStone);px(g,4,15,P.midGray);
  for(let x=5;x<=12;x++)for(let y=3;y<=9;y++)px(g,x,y,P.enemyRed);
  for(let x=5;x<=12;x++)px(g,x,3,P.ember);
  px(g,5,10,P.enemyRed);px(g,6,10,P.brightRed);px(g,8,10,P.enemyRed);px(g,9,10,P.brightRed);px(g,11,10,P.enemyRed);px(g,12,10,P.brightRed);
  px(g,8,5,P.nearWhite);px(g,9,5,P.nearWhite);
  px(g,7,6,P.nearWhite);px(g,8,6,P.paleGray);px(g,9,6,P.paleGray);px(g,10,6,P.nearWhite);
  px(g,8,6,P.black);px(g,9,6,P.black);
  px(g,7,7,P.nearWhite);px(g,8,7,P.nearWhite);px(g,9,7,P.nearWhite);px(g,10,7,P.nearWhite);
  px(g,8,8,P.paleGray);px(g,9,8,P.paleGray);
  px(g,3,2,P.midGray);px(g,4,2,P.lightStone);px(g,5,2,P.midGray);px(g,4,1,P.lightStone);
  save(W,H,g,path.join(OUT,'marker_territory_other.png'));
})();

// 15. LAND PARCEL GRID (16x16)
console.log('\n=== Land Parcel Grid (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  let gl=[0x50,0xa8,0xe8,100],gc=[0x50,0xa8,0xe8,160];
  for(let x=0;x<W;x++)g[0][x]=gl;
  for(let y=0;y<H;y++)g[y][0]=gl;
  for(let x=0;x<W;x++)g[H-1][x]=gl;
  for(let y=0;y<H;y++)g[y][W-1]=gl;
  g[0][0]=gc;g[0][W-1]=gc;g[H-1][0]=gc;g[H-1][W-1]=gc;
  g[1][1]=gl;g[0][1]=gl;g[1][0]=gl;
  save(W,H,g,path.join(OUT,'tile_parcel_grid.png'));
})();

// 16. LAND PARCEL HIGHLIGHT (16x16)
console.log('\n=== Land Parcel Highlight (16x16) ===');
(function(){
  let W=16,H=16,g=grid(W,H);
  let fill=[0x78,0xc8,0x78,60],border=[0x4c,0x9b,0x4c,200],corner=[0xa8,0xe4,0xa0,240];
  for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)g[y][x]=fill;
  for(let x=0;x<W;x++){g[0][x]=border;g[H-1][x]=border;}
  for(let y=0;y<H;y++){g[y][0]=border;g[y][W-1]=border;}
  g[0][0]=corner;g[0][W-1]=corner;g[H-1][0]=corner;g[H-1][W-1]=corner;
  g[1][1]=corner;g[1][2]=corner;g[2][1]=corner;
  g[1][W-2]=corner;g[1][W-3]=corner;g[2][W-2]=corner;
  g[H-2][1]=corner;g[H-2][2]=corner;g[H-3][1]=corner;
  g[H-2][W-2]=corner;g[H-2][W-3]=corner;g[H-3][W-2]=corner;
  save(W,H,g,path.join(OUT,'tile_parcel_highlight.png'));
})();

console.log('\n=== All NFT assets generated! ===');
console.log('Output directory: '+OUT);
