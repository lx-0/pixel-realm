#!/usr/bin/env node
/**
 * gen_accessibility_ui.js — Generate accessibility UI art for PIX-426
 *
 * Deliverables:
 *   1. High-contrast HUD variant sprites
 *   2. Colorblind-safe status indicators (shape+pattern, not color-only)
 *   3. Input method icons (keyboard, mouse, touch glyphs)
 *   4. Scalable UI frame variants (1x @ 16px, 2x @ 32px)
 *
 * All pixel art is authored as SVG <rect> grids and rasterized via sharp.
 * Follows PixelRealm 16×16 style guide.
 *
 * Usage: node scripts/gen_accessibility_ui.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'ui', 'accessibility');

// ── Palette ──────────────────────────────────────────────────────────────
const C = {
  black:    '#0d0d0d',
  white:    '#f0f0f0',
  bright_w: '#ffffff',
  blue:     '#50a8e8',
  green:    '#4c9b4c',
  bright_g: '#44dd44',
  red:      '#d42020',
  bright_r: '#ff4444',
  purple:   '#8844cc',
  bright_p: '#bb66ff',
  gold:     '#ffd700',
  orange:   '#e87020',
  cyan:     '#44cccc',
  dark:     '#2b2b2b',
  gray:     '#6e6e6e',
  mid_gray: '#999999',
  lt_gray:  '#c0c0c0',
};

// ── Helpers ──────────────────────────────────────────────────────────────

function px(x, y, color, w = 1, h = 1, opacity) {
  const op = opacity != null ? ` opacity="${opacity}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"${op}/>`;
}

function svg16(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" style="image-rendering:pixelated;">${body}</svg>`;
}

function svg32(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="image-rendering:pixelated;">${body}</svg>`;
}

async function write(name, svgString) {
  const pngPath = path.join(OUT, name + '.png');
  await sharp(Buffer.from(svgString)).png().toFile(pngPath);
  console.log(`  ✓ ${name}.png`);

  // Also write SVG source
  const svgPath = path.join(OUT, name + '.svg');
  fs.writeFileSync(svgPath, svgString);
}

// Draw a filled rectangle outline (border only)
function rectOutline(x, y, w, h, color) {
  const rects = [];
  rects.push(px(x, y, color, w, 1));           // top
  rects.push(px(x, y + h - 1, color, w, 1));   // bottom
  rects.push(px(x, y + 1, color, 1, h - 2));   // left
  rects.push(px(x + w - 1, y + 1, color, 1, h - 2)); // right
  return rects.join('');
}

// ═════════════════════════════════════════════════════════════════════════
// 1. HIGH-CONTRAST UI VARIANT SPRITES
// ═════════════════════════════════════════════════════════════════════════

function genHighContrastAssets() {
  const assets = {};

  // High-contrast health bar fill — bright green bar with white border
  assets['ui_bar_hp_hc'] = svg16([
    `<!-- High-contrast HP bar fill — bright green + white outline, 16×16 -->`,
    // White outline
    px(0, 5, C.bright_w, 16, 1),
    px(0, 10, C.bright_w, 16, 1),
    px(0, 5, C.bright_w, 1, 6),
    px(15, 5, C.bright_w, 1, 6),
    // Dark interior border
    px(1, 6, C.black, 14, 1),
    px(1, 9, C.black, 14, 1),
    px(1, 6, C.black, 1, 4),
    px(14, 6, C.black, 1, 4),
    // Bright green fill
    px(2, 7, C.bright_g, 12, 2),
    // Highlight line
    px(2, 7, '#88ff88', 12, 1),
  ].join(''));

  // High-contrast mana bar fill — bright purple/blue + white border
  assets['ui_bar_mp_hc'] = svg16([
    `<!-- High-contrast MP bar fill — bright purple + white outline, 16×16 -->`,
    px(0, 5, C.bright_w, 16, 1),
    px(0, 10, C.bright_w, 16, 1),
    px(0, 5, C.bright_w, 1, 6),
    px(15, 5, C.bright_w, 1, 6),
    px(1, 6, C.black, 14, 1),
    px(1, 9, C.black, 14, 1),
    px(1, 6, C.black, 1, 4),
    px(14, 6, C.black, 1, 4),
    px(2, 7, C.bright_p, 12, 2),
    px(2, 7, '#cc99ff', 12, 1),
  ].join(''));

  // High-contrast HUD frame — thick white border with dark fill
  assets['ui_hud_frame_hc'] = svg16([
    `<!-- High-contrast HUD frame — double-thick white border, 16×16 -->`,
    // Outer white border
    rectOutline(0, 0, 16, 16, C.bright_w),
    // Inner white border
    rectOutline(1, 1, 14, 14, C.bright_w),
    // Dark fill
    px(2, 2, C.black, 12, 12),
    // Corner accents
    px(0, 0, C.gold, 1, 1),
    px(15, 0, C.gold, 1, 1),
    px(0, 15, C.gold, 1, 1),
    px(15, 15, C.gold, 1, 1),
  ].join(''));

  // High-contrast minimap border — bright blue/white double border
  assets['ui_minimap_border_hc'] = svg16([
    `<!-- High-contrast minimap border — bright double border, 16×16 -->`,
    rectOutline(0, 0, 16, 16, C.bright_w),
    rectOutline(1, 1, 14, 14, C.blue),
    // Dark interior
    px(2, 2, '#111122', 12, 12),
    // Cardinal tick marks
    px(7, 0, C.gold, 2, 1),  // N
    px(7, 15, C.gold, 2, 1), // S
    px(0, 7, C.gold, 1, 2),  // W
    px(15, 7, C.gold, 1, 2), // E
  ].join(''));

  // High-contrast inventory slot highlight
  assets['ui_slot_highlight_hc'] = svg16([
    `<!-- High-contrast inventory slot highlight — bright yellow border, 16×16 -->`,
    rectOutline(0, 0, 16, 16, C.gold),
    rectOutline(1, 1, 14, 14, C.bright_w),
    // Transparent center (dark very faint)
    px(2, 2, C.gold, 12, 12, 0.15),
    // Corner dots
    px(0, 0, C.bright_w, 1, 1),
    px(15, 0, C.bright_w, 1, 1),
    px(0, 15, C.bright_w, 1, 1),
    px(15, 15, C.bright_w, 1, 1),
  ].join(''));

  return assets;
}

// ═════════════════════════════════════════════════════════════════════════
// 2. COLORBLIND-SAFE STATUS INDICATORS
//    Shape + pattern differentiation, not color-only
// ═════════════════════════════════════════════════════════════════════════

function genColorblindIndicators() {
  const assets = {};

  // ── Buffs (positive) — outlined shapes on transparent bg ──

  // Heal/Regen — circle with plus cross
  assets['icon_buff_heal_cb'] = svg16([
    `<!-- Colorblind-safe heal buff — circle + cross pattern, 16×16 -->`,
    // Circle outline
    px(5, 1, C.bright_g, 6, 1),
    px(3, 2, C.bright_g, 2, 1), px(11, 2, C.bright_g, 2, 1),
    px(2, 3, C.bright_g, 1, 2), px(13, 3, C.bright_g, 1, 2),
    px(1, 5, C.bright_g, 1, 6),
    px(14, 5, C.bright_g, 1, 6),
    px(2, 11, C.bright_g, 1, 2), px(13, 11, C.bright_g, 1, 2),
    px(3, 13, C.bright_g, 2, 1), px(11, 13, C.bright_g, 2, 1),
    px(5, 14, C.bright_g, 6, 1),
    // Plus/cross in center
    px(7, 4, C.bright_w, 2, 8),
    px(4, 7, C.bright_w, 8, 2),
  ].join(''));

  // Attack Up — upward triangle with arrow
  assets['icon_buff_attack_cb'] = svg16([
    `<!-- Colorblind-safe attack buff — upward triangle + arrow, 16×16 -->`,
    // Triangle outline
    px(7, 1, C.bright_r, 2, 1),
    px(6, 2, C.bright_r, 1, 1), px(9, 2, C.bright_r, 1, 1),
    px(5, 3, C.bright_r, 1, 1), px(10, 3, C.bright_r, 1, 1),
    px(4, 4, C.bright_r, 1, 1), px(11, 4, C.bright_r, 1, 1),
    px(3, 5, C.bright_r, 1, 1), px(12, 5, C.bright_r, 1, 1),
    px(3, 6, C.bright_r, 1, 1), px(12, 6, C.bright_r, 1, 1),
    px(2, 7, C.bright_r, 1, 1), px(13, 7, C.bright_r, 1, 1),
    px(2, 8, C.bright_r, 1, 1), px(13, 8, C.bright_r, 1, 1),
    px(1, 9, C.bright_r, 1, 1), px(14, 9, C.bright_r, 1, 1),
    px(1, 10, C.bright_r, 1, 1), px(14, 10, C.bright_r, 1, 1),
    px(1, 11, C.bright_r, 14, 1),
    // Up arrow inside
    px(7, 4, C.bright_w, 2, 6),
    px(6, 5, C.bright_w, 1, 1), px(9, 5, C.bright_w, 1, 1),
    px(5, 6, C.bright_w, 1, 1), px(10, 6, C.bright_w, 1, 1),
    // Arrow-up indicator below triangle
    px(7, 13, C.bright_r, 2, 1),
    px(6, 14, C.bright_r, 1, 1), px(9, 14, C.bright_r, 1, 1),
  ].join(''));

  // Defense Up — shield shape with horizontal bars
  assets['icon_buff_defense_cb'] = svg16([
    `<!-- Colorblind-safe defense buff — shield + horizontal bars, 16×16 -->`,
    // Shield outline
    px(2, 1, C.blue, 12, 1),
    px(1, 2, C.blue, 1, 8), px(14, 2, C.blue, 1, 8),
    px(2, 10, C.blue, 1, 1), px(13, 10, C.blue, 1, 1),
    px(3, 11, C.blue, 1, 1), px(12, 11, C.blue, 1, 1),
    px(4, 12, C.blue, 1, 1), px(11, 12, C.blue, 1, 1),
    px(5, 13, C.blue, 1, 1), px(10, 13, C.blue, 1, 1),
    px(6, 14, C.blue, 4, 1),
    // Horizontal bar pattern inside (3 bars)
    px(3, 3, C.bright_w, 10, 1),
    px(3, 6, C.bright_w, 10, 1),
    px(4, 9, C.bright_w, 8, 1),
  ].join(''));

  // Speed Up — diamond with diagonal lines
  assets['icon_buff_speed_cb'] = svg16([
    `<!-- Colorblind-safe speed buff — diamond + diagonals, 16×16 -->`,
    // Diamond outline
    px(7, 1, C.gold, 2, 1),
    px(6, 2, C.gold, 1, 1), px(9, 2, C.gold, 1, 1),
    px(5, 3, C.gold, 1, 1), px(10, 3, C.gold, 1, 1),
    px(4, 4, C.gold, 1, 1), px(11, 4, C.gold, 1, 1),
    px(3, 5, C.gold, 1, 1), px(12, 5, C.gold, 1, 1),
    px(2, 6, C.gold, 1, 1), px(13, 6, C.gold, 1, 1),
    px(1, 7, C.gold, 1, 2), px(14, 7, C.gold, 1, 2),
    px(2, 9, C.gold, 1, 1), px(13, 9, C.gold, 1, 1),
    px(3, 10, C.gold, 1, 1), px(12, 10, C.gold, 1, 1),
    px(4, 11, C.gold, 1, 1), px(11, 11, C.gold, 1, 1),
    px(5, 12, C.gold, 1, 1), px(10, 12, C.gold, 1, 1),
    px(6, 13, C.gold, 1, 1), px(9, 13, C.gold, 1, 1),
    px(7, 14, C.gold, 2, 1),
    // Speed lines (diagonals inside)
    px(5, 5, C.bright_w, 1, 1), px(6, 6, C.bright_w, 1, 1),
    px(7, 7, C.bright_w, 2, 1),
    px(9, 6, C.bright_w, 1, 1), px(10, 5, C.bright_w, 1, 1),
    // Trailing motion lines
    px(4, 8, C.bright_w, 3, 1),
    px(5, 10, C.bright_w, 2, 1),
    px(9, 8, C.bright_w, 3, 1),
    px(9, 10, C.bright_w, 2, 1),
  ].join(''));

  // ── Debuffs (negative) — filled shapes with pattern overlays ──

  // Poison — skull shape with diagonal hatching
  assets['icon_debuff_poison_cb'] = svg16([
    `<!-- Colorblind-safe poison debuff — skull + diagonal hatch, 16×16 -->`,
    // Skull outline
    px(4, 2, C.green, 8, 1),
    px(3, 3, C.green, 1, 1), px(12, 3, C.green, 1, 1),
    px(2, 4, C.green, 1, 4), px(13, 4, C.green, 1, 4),
    px(3, 8, C.green, 1, 1), px(12, 8, C.green, 1, 1),
    px(4, 9, C.green, 3, 1), px(9, 9, C.green, 3, 1),
    // Eyes (hollow)
    px(5, 5, C.black, 2, 2),
    px(9, 5, C.black, 2, 2),
    // Nose
    px(7, 7, C.black, 2, 1),
    // Teeth
    px(5, 10, C.green, 1, 2), px(7, 10, C.green, 1, 2),
    px(9, 10, C.green, 1, 2),
    // Fill
    px(4, 3, C.green, 8, 1, 0.5),
    px(3, 4, C.green, 10, 4, 0.3),
    // Diagonal hatch pattern
    px(4, 4, C.bright_w, 1, 1), px(6, 4, C.bright_w, 1, 1),
    px(8, 4, C.bright_w, 1, 1), px(10, 4, C.bright_w, 1, 1),
    px(5, 7, C.bright_w, 1, 1),
    px(11, 7, C.bright_w, 1, 1),
    // Drop below skull
    px(7, 13, C.green, 2, 1),
    px(8, 14, C.green, 1, 1),
  ].join(''));

  // Bleed — drip with dot pattern
  assets['icon_debuff_bleed_cb'] = svg16([
    `<!-- Colorblind-safe bleed debuff — droplet + dot pattern, 16×16 -->`,
    // Droplet shape
    px(7, 1, C.bright_r, 2, 1),
    px(6, 2, C.bright_r, 4, 1),
    px(5, 3, C.bright_r, 6, 1),
    px(4, 4, C.bright_r, 8, 1),
    px(3, 5, C.bright_r, 10, 1),
    px(3, 6, C.bright_r, 10, 1),
    px(3, 7, C.bright_r, 10, 1),
    px(3, 8, C.bright_r, 10, 1),
    px(4, 9, C.bright_r, 8, 1),
    px(5, 10, C.bright_r, 6, 1),
    px(6, 11, C.bright_r, 4, 1),
    px(7, 12, C.bright_r, 2, 1),
    // Dot pattern overlay (white dots in grid)
    px(6, 4, C.bright_w, 1, 1), px(9, 4, C.bright_w, 1, 1),
    px(5, 6, C.bright_w, 1, 1), px(7, 6, C.bright_w, 1, 1),
    px(10, 6, C.bright_w, 1, 1),
    px(6, 8, C.bright_w, 1, 1), px(9, 8, C.bright_w, 1, 1),
    px(5, 10, C.bright_w, 1, 1), px(8, 10, C.bright_w, 1, 1),
    // Drip drops below
    px(5, 13, C.bright_r, 1, 1),
    px(10, 14, C.bright_r, 1, 1),
  ].join(''));

  // Slow — hourglass with horizontal lines
  assets['icon_debuff_slow_cb'] = svg16([
    `<!-- Colorblind-safe slow debuff — hourglass + horizontal lines, 16×16 -->`,
    // Hourglass outline
    px(2, 1, C.cyan, 12, 1),
    px(2, 14, C.cyan, 12, 1),
    px(3, 2, C.cyan, 1, 1), px(12, 2, C.cyan, 1, 1),
    px(4, 3, C.cyan, 1, 1), px(11, 3, C.cyan, 1, 1),
    px(5, 4, C.cyan, 1, 1), px(10, 4, C.cyan, 1, 1),
    px(6, 5, C.cyan, 1, 1), px(9, 5, C.cyan, 1, 1),
    px(7, 6, C.cyan, 2, 1),
    px(7, 9, C.cyan, 2, 1),
    px(6, 10, C.cyan, 1, 1), px(9, 10, C.cyan, 1, 1),
    px(5, 11, C.cyan, 1, 1), px(10, 11, C.cyan, 1, 1),
    px(4, 12, C.cyan, 1, 1), px(11, 12, C.cyan, 1, 1),
    px(3, 13, C.cyan, 1, 1), px(12, 13, C.cyan, 1, 1),
    // Horizontal line pattern inside
    px(4, 2, C.bright_w, 8, 1),
    px(6, 4, C.bright_w, 4, 1),
    px(7, 7, C.bright_w, 2, 1),
    px(6, 11, C.bright_w, 4, 1),
    px(4, 13, C.bright_w, 8, 1),
  ].join(''));

  // Weaken — broken sword with zigzag
  assets['icon_debuff_weaken_cb'] = svg16([
    `<!-- Colorblind-safe weaken debuff — broken sword + zigzag, 16×16 -->`,
    // Sword blade (upper)
    px(7, 1, C.lt_gray, 2, 5),
    px(6, 1, C.mid_gray, 1, 1), px(9, 1, C.mid_gray, 1, 1),
    // Break point — zigzag crack
    px(6, 6, C.bright_r, 1, 1), px(7, 7, C.bright_r, 1, 1),
    px(8, 6, C.bright_r, 1, 1), px(9, 7, C.bright_r, 1, 1),
    // Lower blade piece (offset/rotated to show break)
    px(8, 8, C.lt_gray, 2, 4),
    px(10, 8, C.mid_gray, 1, 1),
    // Crossguard
    px(5, 5, C.orange, 6, 1),
    // Handle
    px(7, 12, C.orange, 2, 2),
    // Down arrow overlay
    px(3, 10, C.bright_r, 1, 1), px(4, 11, C.bright_r, 1, 1),
    px(2, 11, C.bright_r, 1, 1),
    px(3, 12, C.bright_r, 1, 1),
  ].join(''));

  // ── Damage type indicators ──

  // Physical damage — sword silhouette
  assets['icon_dmg_physical_cb'] = svg16([
    `<!-- Colorblind-safe physical damage — sword silhouette, 16×16 -->`,
    // Blade
    px(7, 0, C.lt_gray, 2, 9),
    px(6, 0, C.mid_gray, 1, 2),
    px(9, 0, C.mid_gray, 1, 2),
    // Highlight edge
    px(7, 0, C.bright_w, 1, 8),
    // Crossguard
    px(4, 9, C.orange, 8, 1),
    px(4, 10, C.dark, 8, 1),
    // Grip
    px(7, 11, C.orange, 2, 3),
    // Pommel
    px(6, 14, C.gold, 4, 1),
  ].join(''));

  // Fire damage — flame + wavy lines
  assets['icon_dmg_fire_cb'] = svg16([
    `<!-- Colorblind-safe fire damage — flame + wavy lines, 16×16 -->`,
    // Outer flame
    px(7, 1, C.bright_r, 2, 1),
    px(6, 2, C.bright_r, 4, 1),
    px(5, 3, C.bright_r, 2, 1), px(9, 3, C.bright_r, 2, 1),
    px(4, 4, C.bright_r, 2, 1), px(10, 4, C.bright_r, 2, 1),
    px(3, 5, C.bright_r, 2, 1), px(11, 5, C.bright_r, 2, 1),
    px(3, 6, C.bright_r, 10, 1),
    px(3, 7, C.bright_r, 10, 1),
    px(4, 8, C.bright_r, 8, 1),
    px(5, 9, C.bright_r, 6, 1),
    px(5, 10, C.bright_r, 6, 1),
    px(6, 11, C.bright_r, 4, 1),
    // Inner flame (orange core)
    px(7, 4, C.orange, 2, 1),
    px(6, 5, C.orange, 4, 1),
    px(6, 6, C.orange, 4, 1),
    px(7, 7, C.gold, 2, 1),
    px(7, 8, C.gold, 2, 1),
    // Wavy lines below (pattern differentiator)
    px(3, 13, C.bright_r, 2, 1), px(6, 12, C.bright_r, 1, 1),
    px(7, 13, C.bright_r, 2, 1), px(10, 12, C.bright_r, 1, 1),
    px(11, 13, C.bright_r, 2, 1),
    px(4, 14, C.bright_r, 2, 1), px(8, 14, C.bright_r, 2, 1),
  ].join(''));

  // Ice damage — crystal + dot pattern
  assets['icon_dmg_ice_cb'] = svg16([
    `<!-- Colorblind-safe ice damage — crystal + dot pattern, 16×16 -->`,
    // Crystal shape (hexagonal)
    px(7, 1, C.cyan, 2, 1),
    px(6, 2, C.cyan, 4, 1),
    px(5, 3, C.cyan, 6, 1),
    px(4, 4, C.cyan, 8, 1),
    px(3, 5, C.cyan, 10, 1),
    px(3, 6, C.cyan, 10, 1),
    px(3, 7, C.cyan, 10, 1),
    px(4, 8, C.cyan, 8, 1),
    px(5, 9, C.cyan, 6, 1),
    px(6, 10, C.cyan, 4, 1),
    px(7, 11, C.cyan, 2, 1),
    // Inner highlight
    px(7, 4, C.bright_w, 2, 1),
    px(6, 5, C.bright_w, 1, 1),
    px(5, 6, C.bright_w, 1, 1),
    // Dot pattern overlay
    px(6, 6, C.bright_w, 1, 1), px(9, 6, C.bright_w, 1, 1),
    px(7, 8, C.bright_w, 1, 1), px(10, 5, C.bright_w, 1, 1),
    px(5, 8, C.bright_w, 1, 1),
    // Snowflake arms below
    px(7, 13, C.cyan, 2, 1),
    px(5, 13, C.cyan, 1, 1), px(10, 13, C.cyan, 1, 1),
    px(6, 14, C.cyan, 1, 1), px(9, 14, C.cyan, 1, 1),
  ].join(''));

  // Poison damage — droplet + chevrons
  assets['icon_dmg_poison_cb'] = svg16([
    `<!-- Colorblind-safe poison damage — droplet + chevron pattern, 16×16 -->`,
    // Droplet
    px(7, 1, C.green, 2, 1),
    px(6, 2, C.green, 4, 1),
    px(5, 3, C.green, 6, 1),
    px(4, 4, C.green, 8, 1),
    px(3, 5, C.green, 10, 1),
    px(3, 6, C.green, 10, 1),
    px(3, 7, C.green, 10, 1),
    px(4, 8, C.green, 8, 1),
    px(5, 9, C.green, 6, 1),
    px(6, 10, C.green, 4, 1),
    px(7, 11, C.green, 2, 1),
    // Chevron pattern inside (V shapes)
    px(5, 4, C.bright_w, 1, 1), px(10, 4, C.bright_w, 1, 1),
    px(6, 5, C.bright_w, 1, 1), px(9, 5, C.bright_w, 1, 1),
    px(7, 6, C.bright_w, 2, 1),
    px(5, 7, C.bright_w, 1, 1), px(10, 7, C.bright_w, 1, 1),
    px(6, 8, C.bright_w, 1, 1), px(9, 8, C.bright_w, 1, 1),
    px(7, 9, C.bright_w, 2, 1),
    // Bubbles below
    px(5, 13, C.green, 1, 1),
    px(8, 12, C.green, 2, 2),
    px(11, 14, C.green, 1, 1),
  ].join(''));

  return assets;
}

// ═════════════════════════════════════════════════════════════════════════
// 3. INPUT METHOD ICONS
// ═════════════════════════════════════════════════════════════════════════

function genInputIcons() {
  const assets = {};

  // Keyboard glyph (simplified for input hints)
  assets['icon_input_keyboard'] = svg16([
    `<!-- Keyboard input glyph — 16×16 pixel art -->`,
    // Body
    px(1, 4, C.dark, 14, 9),
    rectOutline(1, 4, 14, 9, C.black),
    // Top row (4 keys)
    px(3, 5, C.gray, 2, 2), px(6, 5, C.gray, 2, 2),
    px(9, 5, C.gray, 2, 2), px(12, 5, C.gray, 1, 2),
    // Middle row (3 keys)
    px(3, 8, C.gray, 2, 1), px(6, 8, C.gray, 2, 1),
    px(9, 8, C.gray, 3, 1),
    // Space bar
    px(4, 10, C.gray, 8, 1),
    // Highlight one key
    px(3, 5, C.blue, 2, 2),
  ].join(''));

  // Mouse glyph
  assets['icon_input_mouse'] = svg16([
    `<!-- Mouse input glyph — 16×16 pixel art -->`,
    // Body outline
    px(5, 2, C.black, 6, 1),
    px(4, 3, C.black, 1, 1), px(11, 3, C.black, 1, 1),
    px(3, 4, C.black, 1, 9), px(12, 4, C.black, 1, 9),
    px(4, 13, C.black, 1, 1), px(11, 13, C.black, 1, 1),
    px(5, 14, C.black, 6, 1),
    // Body fill
    px(5, 3, C.dark, 6, 1),
    px(4, 4, C.dark, 8, 9),
    px(5, 13, C.dark, 6, 1),
    // Left button
    px(4, 4, C.gray, 3, 3),
    // Right button
    px(9, 4, C.gray, 3, 3),
    // Divider
    px(7, 3, C.black, 2, 5),
    // Scroll wheel
    px(7, 4, C.blue, 2, 2),
    // Click highlight
    px(4, 4, C.blue, 3, 3, 0.4),
  ].join(''));

  // Touch/finger glyph
  assets['icon_input_touch'] = svg16([
    `<!-- Touch/finger input glyph — 16×16 pixel art -->`,
    // Finger tip (pointing down)
    px(6, 1, C.white, 4, 1),
    px(5, 2, C.white, 6, 1),
    px(5, 3, C.white, 6, 1),
    px(5, 4, C.white, 6, 1),
    px(5, 5, C.white, 6, 1),
    px(5, 6, C.white, 6, 1),
    px(5, 7, C.white, 6, 1),
    px(6, 8, C.white, 4, 1),
    // Outline
    px(6, 0, C.black, 4, 1),
    px(5, 1, C.black, 1, 1), px(10, 1, C.black, 1, 1),
    px(4, 2, C.black, 1, 7), px(11, 2, C.black, 1, 7),
    px(5, 8, C.black, 1, 1), px(10, 8, C.black, 1, 1),
    px(6, 9, C.black, 4, 1),
    // Touch ripple rings
    px(3, 10, C.blue, 10, 1, 0.7),
    px(2, 11, C.blue, 1, 1, 0.7), px(13, 11, C.blue, 1, 1, 0.7),
    px(2, 12, C.blue, 1, 1, 0.5), px(13, 12, C.blue, 1, 1, 0.5),
    px(1, 11, C.blue, 1, 3, 0.3), px(14, 11, C.blue, 1, 3, 0.3),
    px(2, 14, C.blue, 12, 1, 0.3),
    px(3, 13, C.blue, 10, 1, 0.5),
  ].join(''));

  // WASD keys
  assets['icon_key_wasd'] = svg16([
    `<!-- WASD key cluster — 16×16 pixel art -->`,
    // W key (top center)
    px(6, 1, C.dark, 5, 4),
    rectOutline(6, 1, 5, 4, C.gray),
    px(7, 2, C.bright_w, 1, 1), px(9, 2, C.bright_w, 1, 1),
    px(8, 3, C.bright_w, 1, 1),
    // A key (bottom left)
    px(1, 6, C.dark, 5, 4),
    rectOutline(1, 6, 5, 4, C.gray),
    px(3, 7, C.bright_w, 1, 2),
    px(2, 8, C.bright_w, 1, 1), px(4, 8, C.bright_w, 1, 1),
    // S key (bottom center)
    px(6, 6, C.dark, 5, 4),
    rectOutline(6, 6, 5, 4, C.gray),
    px(7, 7, C.bright_w, 2, 1),
    px(8, 8, C.bright_w, 2, 1),
    // D key (bottom right)
    px(11, 6, C.dark, 4, 4),
    rectOutline(11, 6, 4, 4, C.gray),
    px(12, 7, C.bright_w, 1, 2),
    px(13, 8, C.bright_w, 1, 1),
    // Focus highlight on W
    px(6, 1, C.blue, 5, 1, 0.4),
  ].join(''));

  // Arrow keys
  assets['icon_key_arrows'] = svg16([
    `<!-- Arrow key cluster — 16×16 pixel art -->`,
    // Up arrow key (top center)
    px(6, 1, C.dark, 5, 4),
    rectOutline(6, 1, 5, 4, C.gray),
    px(8, 2, C.bright_w, 1, 1),
    px(7, 3, C.bright_w, 3, 1),
    // Left key
    px(1, 6, C.dark, 5, 4),
    rectOutline(1, 6, 5, 4, C.gray),
    px(2, 8, C.bright_w, 1, 1),
    px(3, 7, C.bright_w, 1, 3),
    // Down key
    px(6, 6, C.dark, 5, 4),
    rectOutline(6, 6, 5, 4, C.gray),
    px(7, 7, C.bright_w, 3, 1),
    px(8, 8, C.bright_w, 1, 1),
    // Right key
    px(11, 6, C.dark, 4, 4),
    rectOutline(11, 6, 4, 4, C.gray),
    px(13, 8, C.bright_w, 1, 1),
    px(12, 7, C.bright_w, 1, 3),
  ].join(''));

  // Space bar key
  assets['icon_key_space'] = svg16([
    `<!-- Space bar key — 16×16 pixel art -->`,
    px(1, 5, C.dark, 14, 6),
    rectOutline(1, 5, 14, 6, C.gray),
    // Inner border
    rectOutline(2, 6, 12, 4, C.black),
    // Label dots (─── pattern)
    px(4, 8, C.bright_w, 8, 1),
    // Light edge
    px(2, 6, C.lt_gray, 12, 1),
  ].join(''));

  // ESC key
  assets['icon_key_esc'] = svg16([
    `<!-- ESC key — 16×16 pixel art -->`,
    px(2, 3, C.dark, 12, 10),
    rectOutline(2, 3, 12, 10, C.gray),
    rectOutline(3, 4, 10, 8, C.black),
    // E
    px(4, 5, C.bright_w, 1, 5), px(5, 5, C.bright_w, 1, 1),
    px(5, 7, C.bright_w, 1, 1), px(5, 9, C.bright_w, 1, 1),
    // S
    px(7, 5, C.bright_w, 2, 1), px(7, 7, C.bright_w, 2, 1),
    px(7, 9, C.bright_w, 2, 1),
    px(7, 6, C.bright_w, 1, 1), px(8, 8, C.bright_w, 1, 1),
    // C
    px(10, 5, C.bright_w, 2, 1), px(10, 9, C.bright_w, 2, 1),
    px(10, 6, C.bright_w, 1, 3),
  ].join(''));

  // TAB key
  assets['icon_key_tab'] = svg16([
    `<!-- TAB key — 16×16 pixel art -->`,
    px(2, 3, C.dark, 12, 10),
    rectOutline(2, 3, 12, 10, C.gray),
    rectOutline(3, 4, 10, 8, C.black),
    // Arrow symbol (→|)
    px(4, 7, C.bright_w, 6, 1),
    px(8, 6, C.bright_w, 1, 1), px(8, 8, C.bright_w, 1, 1),
    px(9, 7, C.bright_w, 1, 1),
    // Bar
    px(11, 5, C.bright_w, 1, 5),
  ].join(''));

  // Enter key
  assets['icon_key_enter'] = svg16([
    `<!-- Enter key — 16×16 pixel art -->`,
    px(2, 3, C.dark, 12, 10),
    rectOutline(2, 3, 12, 10, C.gray),
    rectOutline(3, 4, 10, 8, C.black),
    // Return arrow ↵
    px(10, 5, C.bright_w, 1, 4),
    px(5, 8, C.bright_w, 5, 1),
    px(6, 7, C.bright_w, 1, 1),
    px(6, 9, C.bright_w, 1, 1),
    px(5, 8, C.bright_w, 1, 1),
  ].join(''));

  return assets;
}

// ═════════════════════════════════════════════════════════════════════════
// 4. SCALABLE UI FRAME VARIANTS (1x @ 16px and 2x @ 32px)
// ═════════════════════════════════════════════════════════════════════════

function genScalableFrames() {
  const assets = {};

  // ── Dialog frames ──

  // 1x dialog frame (16x16) — 9-slice friendly
  assets['ui_dialog_frame_1x'] = svg16([
    `<!-- Dialog frame 1x — 16×16, 9-slice compatible -->`,
    // Outer border
    rectOutline(0, 0, 16, 16, C.black),
    // Inner border
    rectOutline(1, 1, 14, 14, C.gray),
    // Fill
    px(2, 2, '#1a1a2e', 12, 12),
    // Top bar accent
    px(2, 1, C.blue, 12, 1),
    // Corner rivets
    px(1, 1, C.gold, 1, 1),
    px(14, 1, C.gold, 1, 1),
    px(1, 14, C.gold, 1, 1),
    px(14, 14, C.gold, 1, 1),
    // Inner shadow
    px(2, 2, '#111128', 12, 1),
    px(2, 2, '#111128', 1, 12),
  ].join(''));

  // 2x dialog frame (32x32)
  assets['ui_dialog_frame_2x'] = svg32([
    `<!-- Dialog frame 2x — 32×32, 9-slice compatible -->`,
    // Outer border (2px thick)
    px(0, 0, C.black, 32, 2), px(0, 30, C.black, 32, 2),
    px(0, 0, C.black, 2, 32), px(30, 0, C.black, 2, 32),
    // Inner border
    px(2, 2, C.gray, 28, 1), px(2, 29, C.gray, 28, 1),
    px(2, 2, C.gray, 1, 28), px(29, 2, C.gray, 1, 28),
    // Fill
    px(3, 3, '#1a1a2e', 26, 26),
    // Top bar accent (thicker)
    px(3, 2, C.blue, 26, 2),
    // Corner rivets (2x2)
    px(2, 2, C.gold, 2, 2),
    px(28, 2, C.gold, 2, 2),
    px(2, 28, C.gold, 2, 2),
    px(28, 28, C.gold, 2, 2),
    // Inner shadow
    px(3, 4, '#111128', 26, 2),
    px(3, 4, '#111128', 2, 24),
    // Decorative line under title bar
    px(4, 6, C.gray, 24, 1, 0.5),
  ].join(''));

  // ── Tooltip backgrounds ──

  // 1x tooltip (16x16)
  assets['ui_tooltip_bg_1x'] = svg16([
    `<!-- Tooltip background 1x — 16×16 -->`,
    rectOutline(0, 0, 16, 16, C.black),
    px(1, 1, '#222244', 14, 14),
    // Subtle top highlight
    px(1, 1, '#333366', 14, 1),
    // Bottom shadow
    px(1, 14, '#111122', 14, 1),
  ].join(''));

  // 2x tooltip (32x32)
  assets['ui_tooltip_bg_2x'] = svg32([
    `<!-- Tooltip background 2x — 32×32 -->`,
    px(0, 0, C.black, 32, 2), px(0, 30, C.black, 32, 2),
    px(0, 0, C.black, 2, 32), px(30, 0, C.black, 2, 32),
    px(2, 2, '#222244', 28, 28),
    // Highlight
    px(2, 2, '#333366', 28, 2),
    // Shadow
    px(2, 28, '#111122', 28, 2),
  ].join(''));

  // ── Button states (1x) ──

  // Button normal
  assets['ui_btn_normal_1x'] = svg16([
    `<!-- Button normal state 1x — 16×16 -->`,
    rectOutline(0, 0, 16, 16, C.black),
    px(1, 1, '#3a3a5c', 14, 14),
    // Top highlight
    px(1, 1, '#4a4a7c', 14, 1),
    px(1, 2, '#444470', 14, 1),
    // Bottom shadow
    px(1, 13, '#2a2a44', 14, 1),
    px(1, 14, '#222238', 14, 1),
  ].join(''));

  // Button hover
  assets['ui_btn_hover_1x'] = svg16([
    `<!-- Button hover state 1x — 16×16 -->`,
    rectOutline(0, 0, 16, 16, C.blue),
    px(1, 1, '#4a4a7c', 14, 14),
    px(1, 1, '#5a5a9c', 14, 1),
    px(1, 2, '#555588', 14, 1),
    px(1, 13, '#3a3a5c', 14, 1),
    px(1, 14, '#333350', 14, 1),
  ].join(''));

  // Button pressed
  assets['ui_btn_pressed_1x'] = svg16([
    `<!-- Button pressed state 1x — 16×16 -->`,
    rectOutline(0, 0, 16, 16, C.blue),
    px(1, 1, '#2a2a44', 14, 14),
    // Inverted lighting (pressed in)
    px(1, 1, '#222238', 14, 1),
    px(1, 2, '#252540', 14, 1),
    px(1, 13, '#3a3a5c', 14, 1),
    px(1, 14, '#4a4a7c', 14, 1),
  ].join(''));

  // ── Button states (2x) ──

  assets['ui_btn_normal_2x'] = svg32([
    `<!-- Button normal state 2x — 32×32 -->`,
    px(0, 0, C.black, 32, 2), px(0, 30, C.black, 32, 2),
    px(0, 0, C.black, 2, 32), px(30, 0, C.black, 2, 32),
    px(2, 2, '#3a3a5c', 28, 28),
    px(2, 2, '#4a4a7c', 28, 2),
    px(2, 4, '#444470', 28, 2),
    px(2, 26, '#2a2a44', 28, 2),
    px(2, 28, '#222238', 28, 2),
  ].join(''));

  assets['ui_btn_hover_2x'] = svg32([
    `<!-- Button hover state 2x — 32×32 -->`,
    px(0, 0, C.blue, 32, 2), px(0, 30, C.blue, 32, 2),
    px(0, 0, C.blue, 2, 32), px(30, 0, C.blue, 2, 32),
    px(2, 2, '#4a4a7c', 28, 28),
    px(2, 2, '#5a5a9c', 28, 2),
    px(2, 4, '#555588', 28, 2),
    px(2, 26, '#3a3a5c', 28, 2),
    px(2, 28, '#333350', 28, 2),
  ].join(''));

  assets['ui_btn_pressed_2x'] = svg32([
    `<!-- Button pressed state 2x — 32×32 -->`,
    px(0, 0, C.blue, 32, 2), px(0, 30, C.blue, 32, 2),
    px(0, 0, C.blue, 2, 32), px(30, 0, C.blue, 2, 32),
    px(2, 2, '#2a2a44', 28, 28),
    px(2, 2, '#222238', 28, 2),
    px(2, 4, '#252540', 28, 2),
    px(2, 26, '#3a3a5c', 28, 2),
    px(2, 28, '#4a4a7c', 28, 2),
  ].join(''));

  return assets;
}

// ═════════════════════════════════════════════════════════════════════════
// Main
// ═════════════════════════════════════════════════════════════════════════

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  console.log('\n🎨 Generating accessibility UI art (PIX-426)\n');

  console.log('1. High-contrast HUD variants:');
  const hc = genHighContrastAssets();
  for (const [name, svg] of Object.entries(hc)) await write(name, svg);

  console.log('\n2. Colorblind-safe status indicators:');
  const cb = genColorblindIndicators();
  for (const [name, svg] of Object.entries(cb)) await write(name, svg);

  console.log('\n3. Input method icons:');
  const inp = genInputIcons();
  for (const [name, svg] of Object.entries(inp)) await write(name, svg);

  console.log('\n4. Scalable UI frame variants:');
  const frames = genScalableFrames();
  for (const [name, svg] of Object.entries(frames)) await write(name, svg);

  const total = Object.keys(hc).length + Object.keys(cb).length +
                Object.keys(inp).length + Object.keys(frames).length;
  console.log(`\n✅ Generated ${total} assets (PNG + SVG) in ${OUT}\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
