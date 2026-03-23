/**
 * VFX configuration for PIX-144: Game Juice Pass.
 *
 * Maps every visual effect to its spritesheet, animation timing,
 * particle counts, and gameplay parameters. All spritesheets are
 * 6-frame × 32×32px (192×32px total) in assets/vfx/.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type DamageType = 'physical' | 'fire' | 'ice' | 'poison' | 'lightning';

export interface VfxDef {
  /** Spritesheet path relative to assets/ */
  sheet: string;
  /** Frame dimensions in pixels */
  frameWidth: number;
  frameHeight: number;
  /** Total animation frames */
  frameCount: number;
  /** Frames per second */
  fps: number;
  /** Total duration in ms (derived: frameCount / fps × 1000) */
  durationMs: number;
  /** Whether the animation should loop */
  loop: boolean;
  /** Display scale multiplier (1 = native 32×32px) */
  scale: number;
  /** Alpha multiplier at spawn (0–1) */
  startAlpha: number;
  /** Alpha at end of animation (0–1, for fade-out) */
  endAlpha: number;
}

export interface ScreenShakeDef {
  /** Horizontal shake intensity in pixels */
  intensityX: number;
  /** Vertical shake intensity in pixels */
  intensityY: number;
  /** Shake duration in ms */
  durationMs: number;
  /** Decay curve: 'linear' | 'exponential' */
  decay: 'linear' | 'exponential';
}

export interface SlowMotionDef {
  /** Time scale (0.1 = 10% speed) */
  timeScale: number;
  /** Duration at slow speed in ms */
  durationMs: number;
  /** Ease-out duration back to normal speed in ms */
  easeOutMs: number;
}

// ── Screen Shake Presets ──────────────────────────────────────────────────────

export const SCREEN_SHAKE = {
  /** Light attack / minor hit */
  LIGHT: {
    intensityX: 1,
    intensityY: 1,
    durationMs: 100,
    decay: 'exponential',
  },
  /** Heavy melee attack */
  HEAVY: {
    intensityX: 3,
    intensityY: 2,
    durationMs: 200,
    decay: 'exponential',
  },
  /** Critical hit */
  CRITICAL: {
    intensityX: 4,
    intensityY: 3,
    durationMs: 250,
    decay: 'exponential',
  },
  /** Boss phase transition */
  BOSS_PHASE: {
    intensityX: 5,
    intensityY: 4,
    durationMs: 400,
    decay: 'linear',
  },
  /** Boss roar */
  BOSS_ROAR: {
    intensityX: 3,
    intensityY: 3,
    durationMs: 500,
    decay: 'linear',
  },
} as const satisfies Record<string, ScreenShakeDef>;

// ── Slow-Motion Presets ───────────────────────────────────────────────────────

export const SLOW_MOTION = {
  /** Critical hit brief pause */
  CRIT_HIT: {
    timeScale: 0.2,
    durationMs: 100,
    easeOutMs: 80,
  },
  /** Boss phase transition dramatic pause */
  BOSS_PHASE: {
    timeScale: 0.1,
    durationMs: 300,
    easeOutMs: 200,
  },
} as const satisfies Record<string, SlowMotionDef>;

// ── VFX Sprite Definitions ───────────────────────────────────────────────────

const BASE: Pick<VfxDef, 'frameWidth' | 'frameHeight' | 'frameCount' | 'fps'> = {
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 6,
  fps: 12,
};

function vfx(
  sheet: string,
  overrides: Partial<Omit<VfxDef, 'sheet'>> = {},
): VfxDef {
  const fps = overrides.fps ?? BASE.fps;
  const frameCount = overrides.frameCount ?? BASE.frameCount;
  return {
    sheet: `vfx/${sheet}.png`,
    frameWidth: overrides.frameWidth ?? BASE.frameWidth,
    frameHeight: overrides.frameHeight ?? BASE.frameHeight,
    frameCount,
    fps,
    durationMs: overrides.durationMs ?? Math.round((frameCount / fps) * 1000),
    loop: overrides.loop ?? false,
    scale: overrides.scale ?? 1,
    startAlpha: overrides.startAlpha ?? 1,
    endAlpha: overrides.endAlpha ?? 0,
  };
}

// ── Hit Feedback ──────────────────────────────────────────────────────────────

export const HIT_VFX = {
  /** White/gold sparks on melee contact */
  SPARKS: vfx('vfx_hit_sparks', { durationMs: 300 }),
  /** Directional knockback flash arc */
  FLASH: vfx('vfx_hit_flash', { durationMs: 200 }),
  /** Enemy red damage overlay (white flash → red fade) */
  DAMAGE: vfx('vfx_hit_damage', { durationMs: 300, startAlpha: 0.9 }),
} as const;

// ── Spell Impact (per damage type) ────────────────────────────────────────────

export const IMPACT_VFX: Record<Exclude<DamageType, 'physical'>, VfxDef> = {
  fire:      vfx('vfx_impact_fire',      { durationMs: 500 }),
  ice:       vfx('vfx_impact_ice',       { durationMs: 500 }),
  poison:    vfx('vfx_impact_poison',    { durationMs: 500 }),
  lightning: vfx('vfx_impact_lightning', { durationMs: 400 }),
} as const;

// ── Level-Up Celebration ──────────────────────────────────────────────────────

export const LEVELUP_VFX = {
  /** Golden starburst with radiating particles */
  BURST: vfx('vfx_levelup_burst', { durationMs: 800, scale: 1.5 }),
  /** Expanding golden ring */
  GLOW: vfx('vfx_levelup_glow', { durationMs: 800, scale: 2 }),
  /** Upward particle fountain (gold + purple) */
  FOUNTAIN: vfx('vfx_levelup_fountain', { durationMs: 800 }),
} as const;

// ── Loot Pickup ───────────────────────────────────────────────────────────────

export const LOOT_VFX = {
  /** Idle pulsing glow on ground items (loops) */
  GLOW: vfx('vfx_loot_glow', { loop: true, durationMs: 500 }),
  /** Sparkle trail on pickup (converge → swoosh up) */
  SPARKLE: vfx('vfx_loot_sparkle', { durationMs: 400 }),
} as const;

// ── Critical Hit ──────────────────────────────────────────────────────────────

export const CRIT_VFX = {
  /** Large starburst with shockwave ring */
  IMPACT: vfx('vfx_crit_impact', { durationMs: 400, scale: 1.5 }),
  /** Radial speed lines (zoom punch) */
  ZOOM: vfx('vfx_crit_zoom', { durationMs: 300, startAlpha: 0.8 }),
} as const;

// ── Boss Phase Transition ─────────────────────────────────────────────────────

export const BOSS_VFX = {
  /** Expanding shockwave rings (red/orange) */
  ROAR: vfx('vfx_boss_roar', { durationMs: 600, scale: 2 }),
  /** Invulnerability shield aura (loops during invuln) */
  SHIELD: vfx('vfx_boss_shield', { loop: true, durationMs: 500, scale: 1.5 }),
  /** Vignette darkening from edges */
  DARKEN: vfx('vfx_boss_darken', { durationMs: 800, scale: 1, endAlpha: 0.7 }),
  /** Health bar red/gold flash sweep */
  PHASE_FLASH: vfx('vfx_boss_phase_flash', { durationMs: 600 }),
} as const;

// ── Damage Number Styling ─────────────────────────────────────────────────────

export const DAMAGE_NUMBERS = {
  /** Normal hit */
  NORMAL: {
    fontSize: 8,
    color: '#F0F0F0',      // white
    strokeColor: '#0D0D0D', // black outline
    risePx: 16,
    durationMs: 600,
    scale: 1,
  },
  /** Critical hit — larger, gold, with bounce */
  CRITICAL: {
    fontSize: 12,
    color: '#FFE040',       // bright yellow
    strokeColor: '#B08000', // dark gold outline
    risePx: 24,
    durationMs: 800,
    scale: 1.5,
  },
  /** Heal — green, floats up */
  HEAL: {
    fontSize: 8,
    color: '#78C878',       // bright green
    strokeColor: '#204020', // dark green outline
    risePx: 14,
    durationMs: 500,
    scale: 1,
  },
  /** Poison tick — small, green */
  POISON_TICK: {
    fontSize: 6,
    color: '#4C9B4C',       // green
    strokeColor: '#205020',
    risePx: 10,
    durationMs: 400,
    scale: 0.8,
  },
} as const;

// ── Composite Effect Sequences ────────────────────────────────────────────────
// These define which VFX, shake, and audio cues fire together.

export const EFFECT_SEQUENCES = {
  /** Standard melee hit */
  MELEE_HIT: {
    vfx: [HIT_VFX.SPARKS],
    shake: SCREEN_SHAKE.LIGHT,
    soundCue: 'sfx_hit_melee',
  },
  /** Heavy melee attack (e.g. charged swing, shield bash) */
  HEAVY_HIT: {
    vfx: [HIT_VFX.SPARKS, HIT_VFX.FLASH],
    shake: SCREEN_SHAKE.HEAVY,
    soundCue: 'sfx_hit_heavy',
  },
  /** Critical hit — VFX + zoom + slow-mo + shake */
  CRITICAL_HIT: {
    vfx: [CRIT_VFX.IMPACT, CRIT_VFX.ZOOM, HIT_VFX.FLASH],
    shake: SCREEN_SHAKE.CRITICAL,
    slowMotion: SLOW_MOTION.CRIT_HIT,
    soundCue: 'sfx_hit_crit',
  },
  /** Level-up celebration — all three layers play together */
  LEVEL_UP: {
    vfx: [LEVELUP_VFX.BURST, LEVELUP_VFX.GLOW, LEVELUP_VFX.FOUNTAIN],
    shake: null,
    soundCue: 'sfx_levelup_fanfare',
  },
  /** Loot pickup */
  LOOT_PICKUP: {
    vfx: [LOOT_VFX.SPARKLE],
    shake: null,
    soundCue: 'sfx_loot_pickup',
  },
  /** Boss enters new phase */
  BOSS_PHASE_CHANGE: {
    vfx: [BOSS_VFX.ROAR, BOSS_VFX.DARKEN, BOSS_VFX.PHASE_FLASH],
    shake: SCREEN_SHAKE.BOSS_PHASE,
    slowMotion: SLOW_MOTION.BOSS_PHASE,
    soundCue: 'sfx_boss_roar',
  },
} as const;
