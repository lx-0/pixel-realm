import Phaser from 'phaser';
import { CANVAS } from '../config/constants';

/**
 * Real minutes that equal one in-game hour.
 * 1 real minute = 1 game hour → full day cycle = 24 real minutes.
 */
export const MINS_PER_GAME_HOUR = 1;

interface PhaseKey {
  hour:  number;  // 0–24 game-hour boundary
  tint:  number;  // fill colour (RGB hex)
  alpha: number;  // overlay alpha 0–1
  icon:  string;  // unicode glyph for clock HUD
}

/** Keyframes for the day-night colour ramp (hour 24 = wrap sentinel = same as 0). */
const PHASES: PhaseKey[] = [
  { hour:  0, tint: 0x000033, alpha: 0.45, icon: '🌙' }, // Night
  { hour:  6, tint: 0xff7733, alpha: 0.18, icon: '🌅' }, // Dawn
  { hour:  9, tint: 0xffffff, alpha: 0.00, icon: '☀'  }, // Day
  { hour: 17, tint: 0xff5522, alpha: 0.18, icon: '🌇' }, // Dusk
  { hour: 21, tint: 0x000033, alpha: 0.45, icon: '🌙' }, // Night
  { hour: 24, tint: 0x000033, alpha: 0.45, icon: '🌙' }, // sentinel
];

/** Lerp a 0–255 byte channel. */
function lerp8(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/**
 * DayNightSystem
 *
 * Manages an in-game 24-hour clock and applies a full-screen colour tint overlay
 * that smoothly transitions between night → dawn → day → dusk → night.
 *
 * Usage:
 *   const dn = new DayNightSystem(this);
 *   // in update():
 *   dn.update(delta);
 */
export class DayNightSystem {
  /** Current hour of day in [0, 24). */
  private gameHour: number;

  /** Milliseconds that advance one game hour. */
  private readonly msPerHour: number;

  /** Full-screen semi-transparent overlay (depth 11 — above sprites, below HUD). */
  private readonly overlay: Phaser.GameObjects.Rectangle;

  /** Clock text displayed in the HUD. */
  private readonly clockText: Phaser.GameObjects.Text;

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
      .rectangle(CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2, CANVAS.WIDTH, CANVAS.HEIGHT, 0x000033, 0)
      .setScrollFactor(0)
      .setDepth(11);

    // Clock text — right side of HUD, below zone name (y≈14) and mute indicator (y≈25).
    this.clockText = scene.add
      .text(CANVAS.WIDTH - 4, 34, '', {
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

  // ── Private ─────────────────────────────────────────────────────────────────

  private applyOverlay(): void {
    const h = this.gameHour;

    // Find surrounding keyframes and interpolation factor.
    let a = PHASES[0];
    let b = PHASES[PHASES.length - 1];
    for (let i = 0; i < PHASES.length - 1; i++) {
      if (h >= PHASES[i].hour && h < PHASES[i + 1].hour) {
        a = PHASES[i];
        b = PHASES[i + 1];
        break;
      }
    }
    const t = (b.hour > a.hour) ? (h - a.hour) / (b.hour - a.hour) : 0;

    // Lerp overlay alpha.
    const alpha = a.alpha + (b.alpha - a.alpha) * t;

    // Lerp overlay RGB.
    const ar = (a.tint >> 16) & 0xff, ag = (a.tint >> 8) & 0xff, ab = a.tint & 0xff;
    const br = (b.tint >> 16) & 0xff, bg = (b.tint >> 8) & 0xff, bb = b.tint & 0xff;
    const tint = (lerp8(ar, br, t) << 16) | (lerp8(ag, bg, t) << 8) | lerp8(ab, bb, t);

    this.overlay.setFillStyle(tint, alpha);

    // Update clock text.
    const hours   = Math.floor(h) % 24;
    const minutes = Math.floor((h % 1) * 60);
    const hh      = String(hours).padStart(2, '0');
    const mm      = String(minutes).padStart(2, '0');
    const icon    = h < 6 ? '🌙' : h < 9 ? '🌅' : h < 17 ? '☀' : h < 21 ? '🌇' : '🌙';
    this.clockText.setText(`${icon} ${hh}:${mm}`);
  }
}
