/**
 * Day/Night Cycle — Palette & Lighting Configuration
 *
 * Defines per-biome tint shifts and global lighting overlay keyframes
 * for the four time-of-day periods: dawn, day, dusk, night.
 *
 * Art direction:
 *  - Day   = base palette, no shift (clear overlay)
 *  - Dawn  = warm gold/amber push (#d4a85a / #f8a060 blend)
 *  - Dusk  = warm orange-red push (#f06020 / #d42020 blend)
 *  - Night = cool blue push (#1a4a8a at 40% blend)
 *
 * All hex colors sourced from the 32-color master palette.
 */

// ── Time-of-Day Periods ─────────────────────────────────────────────────────

export type TimePeriod = 'dawn' | 'day' | 'dusk' | 'night';

/** Hour boundaries for each period (game-hours, 0–24). */
export const TIME_PERIODS: Record<TimePeriod, { start: number; end: number }> = {
  night: { start: 0,  end: 6 },
  dawn:  { start: 6,  end: 9 },
  day:   { start: 9,  end: 17 },
  dusk:  { start: 17, end: 21 },
  // night wraps: 21–24 → 0–6
};

/** Resolve current period from game hour. */
export function getTimePeriod(hour: number): TimePeriod {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 6 && h < 9)   return 'dawn';
  if (h >= 9 && h < 17)  return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}

// ── Global Lighting Overlay Ramp ────────────────────────────────────────────
// These keyframes drive the full-screen colour overlay in DayNightSystem.
// The system lerps between adjacent keyframes based on game hour.
//
// tint:  RGB hex for the overlay rectangle fill
// alpha: overlay opacity (0 = invisible, 1 = opaque)
// icon:  spritesheet frame index in ui_icon_time_sheet.png
//        [0 = dawn, 1 = sun/day, 2 = dusk, 3 = moon/night]

export interface LightingKeyframe {
  hour:  number;
  tint:  number;   // 0xRRGGBB
  alpha: number;   // 0–1
  iconFrame: number;
}

export const LIGHTING_RAMP: LightingKeyframe[] = [
  // Night (midnight → predawn)
  { hour:  0, tint: 0x0a1a3a, alpha: 0.45, iconFrame: 3 },
  // Dawn transition
  { hour:  5, tint: 0x0a1a3a, alpha: 0.35, iconFrame: 3 },
  { hour:  6, tint: 0xd4a85a, alpha: 0.20, iconFrame: 0 },
  { hour:  7, tint: 0xf8a060, alpha: 0.15, iconFrame: 0 },
  // Morning → clear day
  { hour:  9, tint: 0xffffff, alpha: 0.00, iconFrame: 1 },
  // Afternoon (clear, no tint)
  { hour: 15, tint: 0xffffff, alpha: 0.00, iconFrame: 1 },
  // Dusk transition
  { hour: 17, tint: 0xf06020, alpha: 0.12, iconFrame: 2 },
  { hour: 18, tint: 0xd42020, alpha: 0.18, iconFrame: 2 },
  { hour: 19, tint: 0xa01010, alpha: 0.25, iconFrame: 2 },
  // Night falls
  { hour: 21, tint: 0x0a1a3a, alpha: 0.45, iconFrame: 3 },
  // Sentinel (wraps to hour 0)
  { hour: 24, tint: 0x0a1a3a, alpha: 0.45, iconFrame: 3 },
];

// ── Per-Biome Tint Modifiers ────────────────────────────────────────────────
// Each biome applies an additive modifier to the global overlay.
// This lets forests feel cooler at night and deserts feel warmer at dusk.
//
// tintBlend: RGB hex blended with the global overlay tint (50/50 mix)
// alphaOffset: added to global alpha (clamped 0–1)
//   Positive = darker/more tinted, Negative = lighter/less tinted

export interface BiomeTintModifier {
  tintBlend: number;    // 0xRRGGBB
  alphaOffset: number;  // -0.1 to +0.15
}

export type BiomeKey = 'forest' | 'desert' | 'ice' | 'volcanic' | 'ocean' | 'dungeon' | 'town';

export const BIOME_TIME_MODIFIERS: Record<BiomeKey, Record<TimePeriod, BiomeTintModifier>> = {
  forest: {
    dawn:  { tintBlend: 0x2d6e2d, alphaOffset:  0.02 },  // Green-filtered dawn mist
    day:   { tintBlend: 0x78c878, alphaOffset:  0.00 },  // No change — base palette
    dusk:  { tintBlend: 0x6b3a1f, alphaOffset:  0.05 },  // Earthy warm dusk under canopy
    night: { tintBlend: 0x1a3a1a, alphaOffset:  0.08 },  // Deep green-black, very dark
  },
  desert: {
    dawn:  { tintBlend: 0xd4a85a, alphaOffset:  0.03 },  // Golden dawn haze
    day:   { tintBlend: 0xe8d08a, alphaOffset: -0.02 },  // Slightly washed-out glare
    dusk:  { tintBlend: 0xf06020, alphaOffset:  0.05 },  // Intense orange sunset
    night: { tintBlend: 0x1a4a8a, alphaOffset:  0.02 },  // Cooler blue desert night
  },
  ice: {
    dawn:  { tintBlend: 0x90d0f8, alphaOffset:  0.02 },  // Pale blue dawn
    day:   { tintBlend: 0xc8f0ff, alphaOffset: -0.03 },  // Bright, icy glare
    dusk:  { tintBlend: 0x9050e0, alphaOffset:  0.04 },  // Purple-tinted dusk over ice
    night: { tintBlend: 0x0a1a3a, alphaOffset:  0.10 },  // Very dark, deep blue
  },
  volcanic: {
    dawn:  { tintBlend: 0xf06020, alphaOffset: -0.05 },  // Lava glow counters dawn
    day:   { tintBlend: 0xf8a060, alphaOffset: -0.03 },  // Ember haze persists
    dusk:  { tintBlend: 0xd42020, alphaOffset:  0.02 },  // Red merges with dusk
    night: { tintBlend: 0x5a0a0a, alphaOffset:  0.05 },  // Deep blood red glow at night
  },
  ocean: {
    dawn:  { tintBlend: 0x2a7ac0, alphaOffset:  0.02 },  // Blue dawn over water
    day:   { tintBlend: 0x50a8e8, alphaOffset: -0.02 },  // Bright ocean shimmer
    dusk:  { tintBlend: 0xf8a060, alphaOffset:  0.03 },  // Golden light on water
    night: { tintBlend: 0x0a1a3a, alphaOffset:  0.07 },  // Deep dark ocean night
  },
  dungeon: {
    dawn:  { tintBlend: 0x4a4a4a, alphaOffset:  0.10 },  // Dungeons barely see dawn
    day:   { tintBlend: 0x4a4a4a, alphaOffset:  0.08 },  // Always dim underground
    dusk:  { tintBlend: 0x4a4a4a, alphaOffset:  0.10 },  // No real dusk underground
    night: { tintBlend: 0x2b2b2b, alphaOffset:  0.12 },  // Darkest at night (fewer torches?)
  },
  town: {
    dawn:  { tintBlend: 0xe8d08a, alphaOffset:  0.01 },  // Gentle warm dawn
    day:   { tintBlend: 0xffffff, alphaOffset:  0.00 },  // Base palette, no mod
    dusk:  { tintBlend: 0xe8b800, alphaOffset:  0.04 },  // Lantern-warm golden dusk
    night: { tintBlend: 0xa87000, alphaOffset: -0.05 },  // Town has lamplight, less dark
  },
};

// ── Biome Ambient Light Colours (for tinting sprites/tiles directly) ────────
// These are the Phaser tint values to apply to the tilemap layer per biome+time.
// Use: tilemap.setTint(tintColor) or tilemap.setTintFill(tintColor, alpha).
// 0xffffff = no tint (day). Other values shift the overall hue.

export const BIOME_SPRITE_TINTS: Record<BiomeKey, Record<TimePeriod, number>> = {
  forest: {
    dawn:  0xeec89a,  // Warm filtered through canopy
    day:   0xffffff,  // Base
    dusk:  0xd49060,  // Warm amber
    night: 0x4a6a8a,  // Cool desaturated blue-green
  },
  desert: {
    dawn:  0xf0d080,  // Dusty gold
    day:   0xfff8e0,  // Slight warm wash (glare)
    dusk:  0xe87040,  // Vivid orange
    night: 0x5070a0,  // Cool blue
  },
  ice: {
    dawn:  0xc0d8f0,  // Pale blue-white
    day:   0xf0f8ff,  // Near-white glare
    dusk:  0xa080c0,  // Lavender
    night: 0x304060,  // Deep cold blue
  },
  volcanic: {
    dawn:  0xe09060,  // Smoky amber
    day:   0xf0c090,  // Hazy warm
    dusk:  0xc04020,  // Deep red
    night: 0x602020,  // Dark ember glow
  },
  ocean: {
    dawn:  0xb0c8e0,  // Cool blue dawn
    day:   0xe0f0ff,  // Bright blue shimmer
    dusk:  0xe0a060,  // Golden water reflections
    night: 0x203050,  // Deep dark blue
  },
  dungeon: {
    dawn:  0x808080,  // Always dim
    day:   0x909090,  // Slightly brighter (torches)
    dusk:  0x706050,  // Warm torch flicker
    night: 0x404040,  // Very dark
  },
  town: {
    dawn:  0xf0d8a0,  // Warm morning
    day:   0xffffff,  // Base
    dusk:  0xe0b060,  // Lantern warm
    night: 0x6080a0,  // Moonlit but with some lamplight warmth
  },
};

// ── HUD Icon Configuration ──────────────────────────────────────────────────
// Spritesheet: assets/ui/hud/ui_icon_time_sheet.png
// Layout: 64×16, 4 frames of 16×16
// Frame order: [0] dawn, [1] sun/day, [2] dusk, [3] moon/night

export const TIME_ICON_SHEET = {
  key:        'ui_icon_time_sheet',
  path:       'assets/ui/hud/ui_icon_time_sheet.png',
  frameWidth:  16,
  frameHeight: 16,
  frameCount:  4,
} as const;

/** Individual icon PNGs (alternative to spritesheet loading). */
export const TIME_ICON_INDIVIDUAL = {
  dawn: 'assets/ui/hud/ui_icon_time_dawn.png',
  day:  'assets/ui/hud/ui_icon_time_sun.png',
  dusk: 'assets/ui/hud/ui_icon_time_dusk.png',
  night:'assets/ui/hud/ui_icon_time_moon.png',
} as const;
