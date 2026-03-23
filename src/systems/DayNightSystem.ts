import Phaser from 'phaser';
import { CANVAS } from '../config/constants';
import {
  LIGHTING_RAMP,
  LightingKeyframe,
  TIME_ICON_SHEET,
  BIOME_TIME_MODIFIERS,
  BIOME_SPRITE_TINTS,
  BiomeKey,
  getTimePeriod,
} from '../config/dayNightPalette';

/**
 * Real minutes that equal one in-game hour.
 * 1 real minute = 1 game hour → full day cycle = 24 real minutes.
 */
export const MINS_PER_GAME_HOUR = 1;

/** Lerp a 0–255 byte channel. */
function lerp8(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Blend two RGB hex colours at a given ratio (0 = all a, 1 = all b). */
function blendRgb(a: number, b: number, ratio: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (lerp8(ar, br, ratio) << 16) | (lerp8(ag, bg, ratio) << 8) | lerp8(ab, bb, ratio);
}

/**
 * DayNightSystem
 *
 * Manages an in-game 24-hour clock and applies:
 *  1. A full-screen colour tint overlay (smooth dawn → day → dusk → night transitions)
 *  2. Per-biome tint modifiers for zone-specific atmosphere
 *  3. A pixel-art time-of-day icon + digital clock in the HUD
 *
 * Usage:
 *   // In PreloadScene:
 *   DayNightSystem.preload(this);
 *
 *   // In GameScene.create():
 *   const dn = new DayNightSystem(this);
 *   dn.setBiome('forest');
 *
 *   // In GameScene.update():
 *   dn.update(delta);
 */
export class DayNightSystem {
  /** Current hour of day in [0, 24). */
  private gameHour: number;

  /** Milliseconds that advance one game hour. */
  private readonly msPerHour: number;

  /** Full-screen semi-transparent overlay (depth 11 — above sprites, below HUD). */
  private readonly overlay: Phaser.GameObjects.Rectangle;

  /** Time-of-day icon sprite (from spritesheet). */
  private readonly timeIcon: Phaser.GameObjects.Sprite;

  /** Clock text displayed in the HUD (time only, no emoji). */
  private readonly clockText: Phaser.GameObjects.Text;

  /** Active biome key for per-zone tint modifiers. */
  private biome: BiomeKey = 'town';

  /** Track current icon frame to avoid redundant updates. */
  private currentIconFrame = -1;

  /**
   * Preload time-of-day icon spritesheet. Call from PreloadScene.
   */
  static preload(scene: Phaser.Scene): void {
    scene.load.spritesheet(TIME_ICON_SHEET.key, TIME_ICON_SHEET.path, {
      frameWidth: TIME_ICON_SHEET.frameWidth,
      frameHeight: TIME_ICON_SHEET.frameHeight,
    });
  }

  /**
   * @param scene        The active Phaser scene.
   * @param startHour    Initial hour of day (default: 8 = 8 AM).
   * @param minsPerHour  Real-time minutes per game hour (default: MINS_PER_GAME_HOUR).
   */
  constructor(scene: Phaser.Scene, startHour = 8, minsPerHour = MINS_PER_GAME_HOUR) {
    this.gameHour   = startHour % 24;
    this.msPerHour  = minsPerHour * 60 * 1000;

    // Screen-space tint overlay.
    // Depth 11: above world sprites (depth 10) but below the HUD (depth 12).
    this.overlay = scene.add
      .rectangle(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, CANVAS.WIDTH, CANVAS.HEIGHT, 0x0a1a3a, 0)
      .setScrollFactor(0)
      .setDepth(11);

    // Time-of-day icon — right side of HUD, near minimap.
    // Position: right-aligned, below zone name row.
    this.timeIcon = scene.add
      .sprite(CANVAS.WIDTH - 20, 34, TIME_ICON_SHEET.key, 1)
      .setScrollFactor(0)
      .setDepth(13)
      .setOrigin(0, 0);

    // Clock text — positioned right of the icon.
    this.clockText = scene.add
      .text(CANVAS.WIDTH - 4, 36, '', {
        fontSize: '4px',
        color: '#ccddff',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 1,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(13);

    this.applyOverlay();
  }

  /** Call every frame from GameScene.update(). */
  update(delta: number): void {
    this.gameHour = (this.gameHour + delta / this.msPerHour) % 24;
    this.applyOverlay();
  }

  /** Current in-game hour (0–24 exclusive). */
  get hourOfDay(): number {
    return this.gameHour;
  }

  /** Current time period name. */
  get period() {
    return getTimePeriod(this.gameHour);
  }

  /**
   * Set the active biome. Call when the player enters a new zone.
   * Adjusts the overlay tint modifier and sprite tints.
   */
  setBiome(biome: BiomeKey): void {
    this.biome = biome;
    this.applyOverlay();
  }

  /**
   * Get the current biome sprite tint value.
   * Apply this to tilemap layers: `tilemapLayer.setTint(dn.spriteTint)`.
   */
  get spriteTint(): number {
    const period = getTimePeriod(this.gameHour);
    return BIOME_SPRITE_TINTS[this.biome]?.[period] ?? 0xffffff;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private applyOverlay(): void {
    const h = this.gameHour;
    const ramp = LIGHTING_RAMP;

    // Find surrounding keyframes and interpolation factor.
    let a: LightingKeyframe = ramp[0];
    let b: LightingKeyframe = ramp[ramp.length - 1];
    for (let i = 0; i < ramp.length - 1; i++) {
      if (h >= ramp[i].hour && h < ramp[i + 1].hour) {
        a = ramp[i];
        b = ramp[i + 1];
        break;
      }
    }
    const t = (b.hour > a.hour) ? (h - a.hour) / (b.hour - a.hour) : 0;

    // Lerp global overlay alpha & tint.
    let alpha = a.alpha + (b.alpha - a.alpha) * t;
    let tint = blendRgb(a.tint, b.tint, t);

    // Apply per-biome modifier.
    const period = getTimePeriod(h);
    const mod = BIOME_TIME_MODIFIERS[this.biome]?.[period];
    if (mod) {
      tint = blendRgb(tint, mod.tintBlend, 0.5);
      alpha = Math.max(0, Math.min(1, alpha + mod.alphaOffset));
    }

    this.overlay.setFillStyle(tint, alpha);

    // Update icon frame (only when period changes).
    const iconFrame = a.iconFrame;
    if (iconFrame !== this.currentIconFrame) {
      this.timeIcon.setFrame(iconFrame);
      this.currentIconFrame = iconFrame;
    }

    // Update clock text (time only — icon is the sprite).
    const hours   = Math.floor(h) % 24;
    const minutes = Math.floor((h % 1) * 60);
    const hh      = String(hours).padStart(2, '0');
    const mm      = String(minutes).padStart(2, '0');
    this.clockText.setText(`${hh}:${mm}`);
  }
}
