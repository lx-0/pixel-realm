/**
 * Prestige System — Art Asset Configuration
 *
 * Defines sprite keys, frame layouts, and tier color palettes for the
 * prestige/New Game+ visual system. Players who reach level 50 and reset
 * earn prestige tiers with unique visual rewards.
 *
 * Tiers (10 total): Bronze I/II → Silver I/II → Gold I/II →
 *                   Platinum I/II → Diamond I/II
 *
 * All hex colors sourced from the 32-color master palette.
 */

// ── Tier Definitions ────────────────────────────────────────────────────────

export type PrestigeTierBase = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
export type PrestigeTierLevel = 1 | 2;

export interface PrestigeTier {
  base: PrestigeTierBase;
  level: PrestigeTierLevel;
  /** Spritesheet frame index (0–9). */
  frameIndex: number;
  /** Display name shown in UI. */
  displayName: string;
  /** Primary tier color (0xRRGGBB) for tinting/glow effects. */
  primaryColor: number;
  /** Highlight color for sparkle/shimmer VFX. */
  highlightColor: number;
}

export const PRESTIGE_TIERS: PrestigeTier[] = [
  { base: 'bronze',   level: 1, frameIndex: 0, displayName: 'Bronze I',    primaryColor: 0x8b5c2a, highlightColor: 0xd4a85a },
  { base: 'bronze',   level: 2, frameIndex: 1, displayName: 'Bronze II',   primaryColor: 0x8b5c2a, highlightColor: 0xd4a85a },
  { base: 'silver',   level: 1, frameIndex: 2, displayName: 'Silver I',    primaryColor: 0x969696, highlightColor: 0xc8c8c8 },
  { base: 'silver',   level: 2, frameIndex: 3, displayName: 'Silver II',   primaryColor: 0x969696, highlightColor: 0xc8c8c8 },
  { base: 'gold',     level: 1, frameIndex: 4, displayName: 'Gold I',      primaryColor: 0xe8b800, highlightColor: 0xffe040 },
  { base: 'gold',     level: 2, frameIndex: 5, displayName: 'Gold II',     primaryColor: 0xe8b800, highlightColor: 0xffe040 },
  { base: 'platinum', level: 1, frameIndex: 6, displayName: 'Platinum I',  primaryColor: 0x50a8e8, highlightColor: 0x90d0f8 },
  { base: 'platinum', level: 2, frameIndex: 7, displayName: 'Platinum II', primaryColor: 0x50a8e8, highlightColor: 0x90d0f8 },
  { base: 'diamond',  level: 1, frameIndex: 8, displayName: 'Diamond I',   primaryColor: 0x9050e0, highlightColor: 0xc8f0ff },
  { base: 'diamond',  level: 2, frameIndex: 9, displayName: 'Diamond II',  primaryColor: 0x9050e0, highlightColor: 0xc8f0ff },
];

/** Lookup tier by 0-based index (prestige count - 1). */
export function getPrestigeTier(prestigeCount: number): PrestigeTier | null {
  const idx = prestigeCount - 1;
  return PRESTIGE_TIERS[idx] ?? null;
}

// ── Spritesheet Assets ──────────────────────────────────────────────────────

export interface PrestigeSpriteConfig {
  key: string;
  path: string;
  frameWidth: number;
  frameHeight: number;
  /** Total frames in the sheet. */
  frameCount: number;
}

/** Tier shield icons (32×32 each, 10 frames). */
export const PRESTIGE_TIER_ICONS: PrestigeSpriteConfig = {
  key: 'prestige_tier_icons',
  path: 'assets/ui/prestige/ui_prestige_tier_icons.png',
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 10,
};

/** Individual tier icon paths (for static display outside spritesheets). */
export const PRESTIGE_TIER_ICON_PATHS: Record<string, string> = {
  bronze1:   'assets/ui/prestige/ui_prestige_tier_bronze1.png',
  bronze2:   'assets/ui/prestige/ui_prestige_tier_bronze2.png',
  silver1:   'assets/ui/prestige/ui_prestige_tier_silver1.png',
  silver2:   'assets/ui/prestige/ui_prestige_tier_silver2.png',
  gold1:     'assets/ui/prestige/ui_prestige_tier_gold1.png',
  gold2:     'assets/ui/prestige/ui_prestige_tier_gold2.png',
  platinum1: 'assets/ui/prestige/ui_prestige_tier_platinum1.png',
  platinum2: 'assets/ui/prestige/ui_prestige_tier_platinum2.png',
  diamond1:  'assets/ui/prestige/ui_prestige_tier_diamond1.png',
  diamond2:  'assets/ui/prestige/ui_prestige_tier_diamond2.png',
};

/** Nameplate decorative borders (32×24 each, 10 frames). */
export const PRESTIGE_BORDERS: PrestigeSpriteConfig = {
  key: 'prestige_borders',
  path: 'assets/ui/prestige/ui_prestige_borders.png',
  frameWidth: 32,
  frameHeight: 24,
  frameCount: 10,
};

/** Leaderboard badges (16×16 each, 10 frames). */
export const PRESTIGE_BADGES: PrestigeSpriteConfig = {
  key: 'prestige_badges',
  path: 'assets/ui/prestige/ui_prestige_badge.png',
  frameWidth: 16,
  frameHeight: 16,
  frameCount: 10,
};

/** Star/chevron overlay indicators for character sprites (16×8 each, 10 frames). */
export const PRESTIGE_STARS: PrestigeSpriteConfig = {
  key: 'prestige_stars',
  path: 'assets/ui/prestige/ui_prestige_stars.png',
  frameWidth: 16,
  frameHeight: 8,
  frameCount: 10,
};

/** Reset confirmation dialog (single image, not a spritesheet). */
export const PRESTIGE_RESET_PANEL = {
  key: 'prestige_reset_panel',
  path: 'assets/ui/prestige/ui_panel_prestige_reset.png',
  width: 128,
  height: 96,
};

// ── Phaser Loader Helper ────────────────────────────────────────────────────

/**
 * All prestige sprite configs for batch loading in a Phaser preload scene.
 *
 * Usage in preload():
 *   PRESTIGE_SPRITESHEETS.forEach(cfg =>
 *     this.load.spritesheet(cfg.key, cfg.path, {
 *       frameWidth: cfg.frameWidth,
 *       frameHeight: cfg.frameHeight,
 *     })
 *   );
 *   this.load.image(PRESTIGE_RESET_PANEL.key, PRESTIGE_RESET_PANEL.path);
 */
export const PRESTIGE_SPRITESHEETS: PrestigeSpriteConfig[] = [
  PRESTIGE_TIER_ICONS,
  PRESTIGE_BORDERS,
  PRESTIGE_BADGES,
  PRESTIGE_STARS,
];
